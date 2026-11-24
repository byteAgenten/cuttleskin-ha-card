import { parseGraphicConfigJson, type VariableConfig } from '@cuttleskin/runtime';
import { INTEGRATION_ENABLED } from './features';
import type { HomeAssistant } from './hass';
import { errorText, graphicPath, type IntegrationGraphic } from './integration';
import { cardLanguage, message, type CardLanguage, type MessageKey } from './messages';

/** Delay before the cuttleskin configuration is fetched after the URL was edited (ms). */
const LOAD_DELAY = 400;
/** How long to wait for Home Assistant's `ha-form` element (ms). */
const FORM_TIMEOUT = 3000;
/** Prefix of the flat form field names for variables, e.g. `var:speed`. */
const VARIABLE_FIELD = 'var:';

/** Texts of the fixed form fields. */
const LABELS: Readonly<Record<string, MessageKey>> = {
  graphic: 'labelGraphic',
  svg: 'labelSvg',
  config: 'labelConfig',
  aspect_ratio: 'labelAspectRatio',
};

/** Field description for `ha-form`; `selector` is one of Home Assistant's selectors. */
interface FormField {
  readonly name: string;
  readonly required?: boolean;
  readonly selector: Readonly<Record<string, unknown>>;
}

/** Home Assistant's form element. Not a documented API; only these properties are used. */
type HaForm = HTMLElement & {
  hass: HomeAssistant | undefined;
  schema: readonly FormField[];
  data: Record<string, unknown>;
  computeLabel: (field: FormField) => string | undefined;
};

/** Card helpers Home Assistant exposes on `window`; used to get `ha-form` loaded. */
interface CardHelpers {
  createCardElement(config: Record<string, unknown>): HTMLElement;
}
type WindowWithHelpers = Window & { loadCardHelpers?: () => Promise<CardHelpers> };
type CardClass = { getConfigElement?: () => Promise<HTMLElement> | HTMLElement };

/**
 * `ha-form` is loaded lazily by Home Assistant. Opening the editor of a built-in card loads it;
 * this is a common workaround in community cards, not a documented API.
 */
async function ensureHaForm(): Promise<boolean> {
  if (customElements.get('ha-form')) return true;
  try {
    const helpers = await (window as WindowWithHelpers).loadCardHelpers?.();
    const card = helpers?.createCardElement({ type: 'entities', entities: [] });
    await (card?.constructor as CardClass | undefined)?.getConfigElement?.();
  } catch {
    // Falls through to the timeout
  }
  return Promise.race([
    customElements.whenDefined('ha-form').then(() => true),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, FORM_TIMEOUT);
    }),
  ]);
}

function describeVariable(language: CardLanguage, variable: VariableConfig): string {
  switch (variable.type) {
    case 'number':
      return message(language, 'typeNumber', {
        minimum: variable.minimum,
        maximum: variable.maximum,
      });
    case 'boolean':
      return message(language, 'typeBoolean');
    case 'text':
      return message(language, 'typeText');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Visual editor of the card. Fetches the cuttleskin configuration and shows one entity picker per
 * variable. Reports every change as `config-changed` with the complete configuration.
 */
export class CuttleskinCardEditor extends HTMLElement {
  #config: Record<string, unknown> = {};
  #hass: HomeAssistant | undefined;
  #form: HaForm | undefined;
  #variables: readonly VariableConfig[] = [];
  #loadedUrl: string | undefined;
  #loadError: string | undefined;
  #loadTimer: ReturnType<typeof setTimeout> | undefined;
  #formAvailable: boolean | undefined;

  setConfig(config: unknown): void {
    this.#config = isRecord(config) ? config : {};
    this.#scheduleLoad();
    this.#render();
  }

  set hass(hass: HomeAssistant) {
    const first = this.#hass === undefined;
    this.#hass = hass;
    if (this.#form) this.#form.hass = hass;
    // Variables of a portal graphic need `hass`; retry once it is there
    if (first && this.#source().startsWith('graphic:')) {
      this.#loadedUrl = undefined;
      this.#scheduleLoad();
    }
  }

  connectedCallback(): void {
    if (this.#formAvailable !== undefined) return;
    void ensureHaForm().then((available) => {
      this.#formAvailable = available;
      this.#render();
    });
  }

  /** Source of the variables: the portal graphic (`graphic:<id>`) or the configuration URL. */
  #source(): string {
    const graphic =
      INTEGRATION_ENABLED && typeof this.#config.graphic === 'string'
        ? this.#config.graphic.trim()
        : '';
    if (graphic !== '') return `graphic:${graphic}`;
    return typeof this.#config.config === 'string' ? this.#config.config.trim() : '';
  }

  #scheduleLoad(): void {
    const source = this.#source();
    if (source === this.#loadedUrl) return;
    clearTimeout(this.#loadTimer);
    this.#loadTimer = setTimeout(() => void this.#loadVariables(source), LOAD_DELAY);
  }

  /** Text of the cuttleskin configuration, from the integration or from the URL. */
  async #configText(source: string): Promise<string> {
    if (source.startsWith('graphic:')) {
      const callApi = this.#hass?.callApi;
      if (!callApi) throw new Error('Home Assistant API not available');
      const version = typeof this.#config.version === 'number' ? this.#config.version : undefined;
      const graphic = await callApi<IntegrationGraphic>(
        'GET',
        graphicPath(source.slice('graphic:'.length), version),
      );
      return JSON.stringify(graphic.config);
    }
    const response = await fetch(source);
    if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
    return response.text();
  }

  async #loadVariables(source: string): Promise<void> {
    this.#loadedUrl = source;
    let variables: readonly VariableConfig[] = [];
    let error: string | undefined;
    if (source !== '') {
      try {
        variables = parseGraphicConfigJson(await this.#configText(source)).config.variables;
      } catch (cause) {
        error = this.#text('configUnreadable', { reason: errorText(cause) });
      }
    }
    // A newer source was entered meanwhile
    if (source !== this.#loadedUrl) return;
    this.#variables = variables;
    this.#loadError = error;
    this.#render();
  }

  #render(): void {
    if (this.#formAvailable === undefined) return;
    if (!this.#formAvailable) {
      this.textContent = this.#text('editorUnavailable');
      return;
    }

    if (!this.#form) {
      this.#form = document.createElement('ha-form') as HaForm;
      this.#form.addEventListener('value-changed', (event) => {
        const { value } = (event as CustomEvent<{ value: Record<string, unknown> }>).detail;
        this.#changed(value);
      });
      this.#form.computeLabel = (field) => this.#label(field);
      this.replaceChildren(this.#form);
    }

    const note = this.querySelector('.note') ?? document.createElement('p');
    note.className = 'note';
    note.textContent =
      this.#loadError ??
      this.#text(this.#variables.length === 0 ? 'noVariables' : 'entitiesHeading');
    this.#form.after(note);

    this.#form.hass = this.#hass;
    this.#form.schema = this.#schema();
    this.#form.data = this.#formData();
  }

  #schema(): FormField[] {
    return [
      ...(INTEGRATION_ENABLED ? [{ name: 'graphic', selector: { text: {} } }] : []),
      { name: 'svg', selector: { text: {} } },
      { name: 'config', selector: { text: {} } },
      {
        name: 'aspect_ratio',
        selector: { number: { min: 0.1, max: 10, step: 0.01, mode: 'box' } },
      },
      ...this.#variables.map((variable) => ({
        name: `${VARIABLE_FIELD}${variable.name}`,
        selector: { entity: {} },
      })),
    ];
  }

  /** Text in Home Assistant's user language. */
  #text(key: MessageKey, values?: Readonly<Record<string, string | number>>): string {
    return message(this.#language(), key, values);
  }

  #language(): CardLanguage {
    return cardLanguage(this.#hass?.language);
  }

  #label(field: FormField): string | undefined {
    if (!field.name.startsWith(VARIABLE_FIELD)) {
      const key = LABELS[field.name];
      return key ? this.#text(key) : undefined;
    }
    const name = field.name.slice(VARIABLE_FIELD.length);
    const variable = this.#variables.find((candidate) => candidate.name === name);
    return variable ? `${name} (${describeVariable(this.#language(), variable)})` : name;
  }

  /** `ha-form` works with flat fields; the variable mapping is flattened to `var:<name>`. */
  #formData(): Record<string, unknown> {
    const sources = isRecord(this.#config.variables) ? this.#config.variables : {};
    const data: Record<string, unknown> = {
      graphic: this.#config.graphic,
      svg: this.#config.svg,
      config: this.#config.config,
      aspect_ratio: this.#config.aspect_ratio,
    };
    for (const variable of this.#variables) {
      const source = sources[variable.name];
      data[`${VARIABLE_FIELD}${variable.name}`] =
        typeof source === 'string' ? source : isRecord(source) ? source.entity : undefined;
    }
    return data;
  }

  #changed(value: Record<string, unknown>): void {
    const previous = isRecord(this.#config.variables) ? this.#config.variables : {};
    const variables: Record<string, unknown> = {};
    // Keep mappings for variables the loaded configuration does not (yet) list
    for (const [name, source] of Object.entries(previous)) {
      if (!this.#variables.some((variable) => variable.name === name)) variables[name] = source;
    }
    for (const variable of this.#variables) {
      const entity = value[`${VARIABLE_FIELD}${variable.name}`];
      if (typeof entity !== 'string' || entity === '') continue;
      const source = previous[variable.name];
      // Options the form does not show (attribute, map) are kept
      variables[variable.name] = isRecord(source) ? { ...source, entity } : entity;
    }

    const config: Record<string, unknown> = {
      ...this.#config,
      svg: value.svg,
      config: value.config,
      variables,
    };
    // Only one source is written: the portal graphic replaces the file URLs
    if (typeof value.graphic === 'string' && value.graphic.trim() !== '') {
      config.graphic = value.graphic.trim();
      delete config.svg;
      delete config.config;
    } else {
      delete config.graphic;
      delete config.version;
    }
    if (typeof value.aspect_ratio === 'number') config.aspect_ratio = value.aspect_ratio;
    else delete config.aspect_ratio;

    this.#config = config;
    this.#scheduleLoad();
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }),
    );
  }
}
