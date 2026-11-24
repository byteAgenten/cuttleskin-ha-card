import { INTEGRATION_ENABLED } from './features';
import { compileFormula, FormulaError } from './formula';
import type { HassEntity } from './hass';
import { cardLanguage, message, type MessageKey } from './messages';

/** Value a variable can receive from an entity. */
export type SourceValue = string | number | boolean;

/** Where a cuttleskin variable gets its value from. */
export interface VariableSource {
  readonly entity: string;
  /** Read this attribute instead of the state. */
  readonly attribute?: string;
  /** Maps entity states to variable values, e.g. `{ open: true, closed: false }`. */
  readonly map?: Readonly<Record<string, SourceValue>>;
  /** Converts the (numeric) value, e.g. `x / 24 * 100`; applied after `map`. */
  readonly formula?: string;
}

/**
 * Card configuration as written in the dashboard YAML: either `graphic` (loaded through the
 * cuttleskin integration) or `svg` and `config` (URLs of the files).
 */
export interface CuttleskinCardConfig {
  readonly type: string;
  /** Id of a graphic in the cuttleskin portal, loaded through the cuttleskin integration. */
  readonly graphic?: string;
  /** Fixed version of `graphic`; without it the current version. */
  readonly version?: number;
  /** URL of the SVG, e.g. `/local/cuttleskin/speedometer.svg`. */
  readonly svg?: string;
  /** URL of the cuttleskin configuration (JSON). */
  readonly config?: string;
  /** URL of the folder with the images; without it `assets/` next to the SVG. */
  readonly assets?: string;
  /** Width / height of the card area; without it the SVG `viewBox` is used. */
  readonly aspect_ratio?: number;
  /** Variable name -> source. */
  readonly variables?: Readonly<Record<string, VariableSource>>;
}

/** Whether the card has a graphic to show; without one it shows the logo and a hint. */
export function hasSource(config: CuttleskinCardConfig): boolean {
  return config.graphic !== undefined || config.svg !== undefined;
}

/** Ids of portal graphics (UUIDs); the integration accepts the same characters. */
const GRAPHIC_ID = /^[A-Za-z0-9-]{1,64}$/;

/** States that mean "no current value"; the graphic keeps its last value. */
const NO_VALUE_STATES: ReadonlySet<string> = new Set(['unavailable', 'unknown']);

/** Applied after `map`: binary entities report `on`/`off`, which the runtime does not read as boolean. */
const DEFAULT_STATE_MAP: Readonly<Record<string, SourceValue>> = { on: true, off: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSourceValue(value: unknown): value is SourceValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/** Error with a message in the language of the page (see `cardLanguage`). */
function configError(key: MessageKey, values?: Readonly<Record<string, string>>): Error {
  return new Error(message(cardLanguage(), key, values));
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw configError('fieldMissing', { field });
  }
  return value.trim();
}

function parseSource(name: string, value: unknown): VariableSource {
  // Short form `speed: sensor.speed`
  if (typeof value === 'string') return { entity: value };
  if (!isRecord(value) || typeof value.entity !== 'string' || value.entity === '') {
    throw configError('entityMissing', { name });
  }
  const { attribute, map, formula } = value;
  if (attribute !== undefined && typeof attribute !== 'string') {
    throw configError('attributeInvalid', { name });
  }
  if (map !== undefined && (!isRecord(map) || !Object.values(map).every(isSourceValue))) {
    throw configError('mapInvalid', { name });
  }
  if (formula !== undefined && formula !== null) {
    if (typeof formula !== 'string') throw configError('formulaInvalid', { name, reason: '' });
    try {
      compileFormula(formula);
    } catch (error) {
      const reason = error instanceof FormulaError ? error.message : String(error);
      throw configError('formulaInvalid', { name, reason });
    }
  }
  return {
    entity: value.entity,
    ...(attribute === undefined ? {} : { attribute }),
    ...(map === undefined ? {} : { map: map as Record<string, SourceValue> }),
    ...(typeof formula === 'string' ? { formula } : {}),
  };
}

/**
 * Checks the YAML configuration. Throws an error with a message for the user; Home Assistant shows
 * it instead of the card.
 */
export function parseCardConfig(input: unknown): CuttleskinCardConfig {
  if (!isRecord(input)) throw configError('configInvalid');
  // Without the integration a portal graphic cannot be loaded; the option is ignored
  const graphic =
    INTEGRATION_ENABLED && typeof input.graphic === 'string' ? input.graphic.trim() : '';
  if (
    INTEGRATION_ENABLED &&
    input.graphic !== undefined &&
    input.graphic !== null &&
    typeof input.graphic !== 'string'
  ) {
    throw configError('graphicInvalid');
  }
  if (graphic !== '' && !GRAPHIC_ID.test(graphic)) throw configError('graphicInvalid');
  const version = input.version;
  if (
    version !== undefined &&
    version !== null &&
    (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
  ) {
    throw configError('versionInvalid');
  }
  // With a graphic of the portal, files are not needed. Without any source the card is not set
  // up yet (new card, preview in the card picker) and shows the logo; one file alone is an error.
  const given = (value: unknown) => typeof value === 'string' && value.trim() !== '';
  const source =
    graphic !== ''
      ? { graphic, ...(typeof version === 'number' ? { version } : {}) }
      : !given(input.svg) && !given(input.config)
        ? {}
        : { svg: nonEmptyString(input.svg, 'svg'), config: nonEmptyString(input.config, 'config') };
  const assets = input.assets;
  if (assets !== undefined && assets !== null && typeof assets !== 'string') {
    throw configError('assetsInvalid');
  }

  const aspectRatio = input.aspect_ratio;
  if (
    aspectRatio !== undefined &&
    aspectRatio !== null &&
    (typeof aspectRatio !== 'number' || !(aspectRatio > 0))
  ) {
    throw configError('aspectRatioInvalid');
  }

  const rawVariables = input.variables ?? {};
  if (!isRecord(rawVariables)) {
    throw configError('variablesInvalid');
  }
  const variables: Record<string, VariableSource> = {};
  for (const [name, value] of Object.entries(rawVariables)) {
    // The visual editor writes `null` for cleared fields
    if (value === null || value === '') continue;
    variables[name] = parseSource(name, value);
  }

  return {
    type: typeof input.type === 'string' ? input.type : 'custom:cuttleskin-card',
    ...source,
    ...(typeof assets === 'string' && assets.trim() !== '' && graphic === ''
      ? { assets: assets.trim() }
      : {}),
    ...(typeof aspectRatio === 'number' ? { aspect_ratio: aspectRatio } : {}),
    variables,
  };
}

/**
 * Folder for image names in the graphic: `assets`, or `assets/` next to the SVG. For a portal
 * version (`…/versions/3/svg`) that is `…/versions/3/assets/`, where the portal serves its images.
 */
export function assetRoot(config: CuttleskinCardConfig, base: string): string {
  if (config.svg === undefined) return config.assets ?? '';
  try {
    return new URL(config.assets ?? 'assets/', new URL(config.svg, base)).href;
  } catch {
    // The SVG URL has no folder, e.g. a data: URL; relative names then stay unresolved
    return config.assets ?? '';
  }
}

/**
 * Value for a variable from the current entity state, or `undefined` if there is none (entity
 * missing, unavailable or attribute not set). Strings are mapped via `source.map`, then `on`/`off`.
 * Numbers in strings are converted by the runtime itself, unless `source.formula` converts the
 * value; then non-numeric values count as "no value".
 */
export function resolveValue(
  entity: HassEntity | undefined,
  source: VariableSource,
): SourceValue | undefined {
  const value = mappedValue(entity, source);
  if (value === undefined || source.formula === undefined) return value;
  return applyFormula(source.formula, value);
}

function mappedValue(
  entity: HassEntity | undefined,
  source: VariableSource,
): SourceValue | undefined {
  if (!entity) return undefined;
  const raw = source.attribute === undefined ? entity.state : entity.attributes[source.attribute];
  if (!isSourceValue(raw)) return undefined;
  if (typeof raw !== 'string') return raw;
  if (NO_VALUE_STATES.has(raw)) return undefined;

  // Own keys only: a state like "constructor" must not hit Object.prototype
  if (source.map && Object.hasOwn(source.map, raw)) return source.map[raw];
  if (Object.hasOwn(DEFAULT_STATE_MAP, raw)) return DEFAULT_STATE_MAP[raw];
  return raw;
}

/** Result of the formula for a value; `true`/`false` count as 1/0. */
function applyFormula(formula: string, value: SourceValue): number | undefined {
  const x =
    typeof value === 'number'
      ? value
      : typeof value === 'boolean'
        ? Number(value)
        : value.trim() === ''
          ? NaN
          : Number(value);
  if (!Number.isFinite(x)) return undefined;
  const result = compileFormula(formula)(x);
  return Number.isFinite(result) ? result : undefined;
}
