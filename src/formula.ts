/**
 * Small arithmetic formulas for converting entity values, e.g. `x / 24 * 100`.
 *
 * Deliberately no `eval`/`Function`: the formula comes from the dashboard configuration, which
 * other users can edit. Supported are numbers, the value `x`, `+ - * / %`, parentheses, unary
 * minus and the functions `min`, `max`, `round`, `floor`, `ceil`, `abs`, `clamp(value, lo, hi)`.
 */

/** Compiled formula: the converted value for `x`. */
export type Formula = (x: number) => number;

/** Thrown for formulas that cannot be parsed; the message names the problem in English. */
export class FormulaError extends Error {
  override name = 'FormulaError';
}

const MAX_LENGTH = 200;

type Token =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'name'; readonly value: string }
  | { readonly kind: 'op'; readonly value: string };

type Node =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'x' }
  | { readonly kind: 'negate'; readonly operand: Node }
  | { readonly kind: 'binary'; readonly op: string; readonly left: Node; readonly right: Node }
  | { readonly kind: 'call'; readonly name: string; readonly args: readonly Node[] };

/** Functions with their number of arguments (`undefined`: at least one). */
const FUNCTIONS: Readonly<Record<string, { arity?: number; apply: (args: number[]) => number }>> = {
  min: { apply: (args) => Math.min(...args) },
  max: { apply: (args) => Math.max(...args) },
  round: {
    // round(value) or round(value, digits)
    apply: ([value = NaN, digits = 0]) => {
      const factor = 10 ** digits;
      return Math.round(value * factor) / factor;
    },
  },
  floor: { arity: 1, apply: ([value = NaN]) => Math.floor(value) },
  ceil: { arity: 1, apply: ([value = NaN]) => Math.ceil(value) },
  abs: { arity: 1, apply: ([value = NaN]) => Math.abs(value) },
  clamp: {
    arity: 3,
    apply: ([value = NaN, low = NaN, high = NaN]) => Math.min(Math.max(value, low), high),
  },
};

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text.charAt(index);
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    const number = /^(\d+(\.\d*)?|\.\d+)/.exec(text.slice(index));
    if (number) {
      tokens.push({ kind: 'number', value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const name = /^[a-z]+/i.exec(text.slice(index));
    if (name) {
      tokens.push({ kind: 'name', value: name[0].toLowerCase() });
      index += name[0].length;
      continue;
    }
    if ('+-*/%(),'.includes(char)) {
      tokens.push({ kind: 'op', value: char });
      index++;
      continue;
    }
    throw new FormulaError(`unexpected "${char}"`);
  }
  return tokens;
}

/** Recursive descent: sum → product → unary → primary. */
function parse(tokens: readonly Token[]): Node {
  let position = 0;
  const peek = (): Token | undefined => tokens[position];
  const isOp = (value: string): boolean => {
    const token = peek();
    return token?.kind === 'op' && token.value === value;
  };
  const expectOp = (value: string): void => {
    if (!isOp(value)) throw new FormulaError(`expected "${value}"`);
    position++;
  };

  function sum(): Node {
    let left = product();
    while (isOp('+') || isOp('-')) {
      const op = (tokens[position++] as Token).value as string;
      left = { kind: 'binary', op, left, right: product() };
    }
    return left;
  }

  function product(): Node {
    let left = unary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = (tokens[position++] as Token).value as string;
      left = { kind: 'binary', op, left, right: unary() };
    }
    return left;
  }

  function unary(): Node {
    if (isOp('-')) {
      position++;
      return { kind: 'negate', operand: unary() };
    }
    if (isOp('+')) {
      position++;
      return unary();
    }
    return primary();
  }

  function primary(): Node {
    const token = peek();
    if (!token) throw new FormulaError('unexpected end');
    if (token.kind === 'number') {
      position++;
      return { kind: 'number', value: token.value };
    }
    if (token.kind === 'name') {
      position++;
      if (token.value === 'x') return { kind: 'x' };
      const fn = FUNCTIONS[token.value];
      if (!fn) throw new FormulaError(`unknown name "${token.value}"`);
      expectOp('(');
      const args: Node[] = [sum()];
      while (isOp(',')) {
        position++;
        args.push(sum());
      }
      expectOp(')');
      if (fn.arity !== undefined && args.length !== fn.arity) {
        throw new FormulaError(`${token.value} needs ${String(fn.arity)} argument(s)`);
      }
      return { kind: 'call', name: token.value, args };
    }
    if (token.value === '(') {
      position++;
      const inner = sum();
      expectOp(')');
      return inner;
    }
    throw new FormulaError(`unexpected "${token.value}"`);
  }

  const node = sum();
  if (position < tokens.length) throw new FormulaError(`unexpected "${String(peek()?.value)}"`);
  return node;
}

function evaluate(node: Node, x: number): number {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'x':
      return x;
    case 'negate':
      return -evaluate(node.operand, x);
    case 'binary': {
      const left = evaluate(node.left, x);
      const right = evaluate(node.right, x);
      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        default:
          // Modulo that stays positive for negative values, e.g. -1 % 12 = 11
          return ((left % right) + right) % right;
      }
    }
    case 'call':
      return (FUNCTIONS[node.name] as (typeof FUNCTIONS)[string]).apply(
        node.args.map((arg) => evaluate(arg, x)),
      );
  }
}

const cache = new Map<string, Formula>();

/** Compiles a formula; throws `FormulaError` if it cannot be parsed. Results are cached. */
export function compileFormula(text: string): Formula {
  const cached = cache.get(text);
  if (cached) return cached;
  if (text.length > MAX_LENGTH) {
    throw new FormulaError(`longer than ${String(MAX_LENGTH)} characters`);
  }
  const tokens = tokenize(text);
  if (tokens.length === 0) throw new FormulaError('empty');
  const node = parse(tokens);
  const formula: Formula = (x) => evaluate(node, x);
  cache.set(text, formula);
  return formula;
}
