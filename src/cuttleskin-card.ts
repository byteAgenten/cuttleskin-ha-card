import { create, type Graphic } from '@cuttleskin/runtime';
import {
  assetRoot,
  hasSource,
  parseCardConfig,
  resolveValue,
  type CuttleskinCardConfig,
} from './card-config';
import { INTEGRATION_ENABLED } from './features';
import type { HomeAssistant } from './hass';
import { errorText, loadIntegrationGraphic } from './integration';
import { LOGO_SVG } from './logo';
import { cardLanguage, message, type MessageKey } from './messages';

export const CARD_TAG = 'cuttleskin-card';
export const EDITOR_TAG = 'cuttleskin-card-editor';

/** Assumed card width in pixels for `getCardSize` (Home Assistant counts in rows of 50 px). */
const ASSUMED_CARD_WIDTH = 400;

/*
 * The card fills the height Home Assistant gives it (sections view with fixed rows); without one
 * (masonry view) the graphic area takes its height from the aspect ratio. Either way the graphic
 * is zoomed to fit the area.
 */
const STYLE = `
  :host { display: block; height: 100%; }
  ha-card { overflow: hidden; height: 100%; display: flex; flex-direction: column; }
  .graphic { width: 100%; flex: 1 1 auto; min-height: 0; }
  .message {
    padding: 12px 16px;
    color: var(--error-color, #db4437);
    font-size: 0.9em;
  }
  .message[hidden] { display: none; }
  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px 16px;
    color: var(--primary-text-color, #212121);
    text-align: center;
  }
  .placeholder svg { width: min(70%, 260px); height: auto; }
  .placeholder p {
    margin: 0;
    color: var(--secondary-text-color, #727272);
    font-size: 0.9em;
  }
`;

/**
 * Dashboard card `custom:cuttleskin-card`: loads a cuttleskin graphic and sets its variables from
 * entity states.
 *
 * Lifecycle (driven by Home Assistant): `setConfig` with the YAML configuration, then `hass` on
 * every state change in the whole system.
 */
export class CuttleskinCard extends HTMLElement {
  /**
   * Configuration of a newly added card and of the preview in the card picker; Home Assistant
   * adds `type`. Without a graphic the card shows the cuttleskin logo and a hint.
   */
  static getStubConfig(): Omit<CuttleskinCardConfig, 'type'> {
    return { variables: {} };
  }

  /** Visual editor. */
  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TAG);
  }

  readonly #root = this.attachShadow({ mode: 'open' });
  #config: CuttleskinCardConfig | undefined;
  #hass: HomeAssistant | undefined;
  #graphic: Graphic | undefined;
  #container: HTMLDivElement | undefined;
  #message: HTMLDivElement | undefined;
  /** Aspect ratio from the SVG `viewBox`, used without `aspect_ratio`. */
  #svgAspectRatio: number | undefined;
  /** Identifies the latest load; results of older loads are discarded. */
  #loadToken: object | undefined;
  /** A portal graphic was configured before Home Assistant set `hass`. */
  #waitingForHass = false;
  /** Fits the graphic into the card again whenever the card changes its size. */
  readonly #resizeObserver = new ResizeObserver(() => {
    this.#fit();
  });
  /** Last value set per variable; unchanged values are not set again (that restarts transitions). */
  readonly #lastValues = new Map<string, unknown>();

  /** The loaded graphic, e.g. for tests; `undefined` while loading or after an error. */
  get graphic(): Graphic | undefined {
    return this.#graphic;
  }

  setConfig(input: unknown): void {
    const config = parseCardConfig(input);
    const previous = this.#config;
    this.#config = config;
    this.#lastValues.clear();

    // The editor calls setConfig on every keystroke: only reload when the source changes
    if (
      !previous ||
      previous.svg !== config.svg ||
      previous.config !== config.config ||
      previous.assets !== config.assets ||
      previous.graphic !== config.graphic ||
      previous.version !== config.version
    ) {
      void this.#load(config);
    } else {
      this.#applyAspectRatio();
      this.#update();
    }
  }

  set hass(hass: HomeAssistant) {
    this.#hass = hass;
    // Graphics of the portal are loaded through Home Assistant, which needs `hass`
    if (this.#waitingForHass && this.#config) {
      this.#waitingForHass = false;
      void this.#load(this.#config);
      return;
    }
    this.#update();
  }

  /** Height in rows of 50 px for the masonry layout. */
  getCardSize(): number {
    const ratio = this.#aspectRatio();
    return Math.min(20, Math.max(1, Math.round(ASSUMED_CARD_WIDTH / ratio / 50)));
  }

  #aspectRatio(): number {
    return this.#config?.aspect_ratio ?? this.#svgAspectRatio ?? 1;
  }

  #applyAspectRatio(): void {
    // The logo of a card without graphic takes its natural height
    if (this.#container && this.#container.className !== 'placeholder') {
      this.#container.style.aspectRatio = String(this.#aspectRatio());
    }
  }

  #render(): HTMLDivElement {
    if (!this.#message) {
      const style = document.createElement('style');
      style.textContent = STYLE;
      const card = document.createElement('ha-card');
      this.#message = document.createElement('div');
      this.#message.className = 'message';
      this.#message.hidden = true;
      card.append(this.#message);
      this.#root.replaceChildren(style, card);
    }
    // A fresh container per load; the runtime replaces its content
    if (this.#container) {
      this.#resizeObserver.unobserve(this.#container);
      this.#container.remove();
    }
    this.#container = document.createElement('div');
    this.#container.className = 'graphic';
    this.#message.before(this.#container);
    this.#resizeObserver.observe(this.#container);
    return this.#container;
  }

  /**
   * Zooms the graphic so that it fills the card without being cut off. Skipped while the card is
   * not laid out (e.g. on a hidden dashboard tab), where the size is 0.
   */
  #fit(): void {
    const graphic = this.#graphic;
    if (!graphic) return;
    // The runtime observes the size itself; make sure it has read the current one
    graphic.view.resize();
    const { viewSize, contentBounds } = graphic.view.viewport;
    if (
      viewSize.width <= 0 ||
      viewSize.height <= 0 ||
      contentBounds.width <= 0 ||
      contentBounds.height <= 0
    ) {
      return;
    }
    graphic.view.zoomToFit();
  }

  /** Text in Home Assistant's user language. */
  #text(key: MessageKey, values?: Readonly<Record<string, string | number>>): string {
    return message(cardLanguage(this.#hass?.language), key, values);
  }

  #showMessage(text: string | undefined): void {
    if (!this.#message) return;
    this.#message.textContent = text ?? '';
    this.#message.hidden = text === undefined;
  }

  /** Loads the graphic from the files or, with `graphic`, through the cuttleskin integration. */
  async #loadInto(graphic: Graphic, config: CuttleskinCardConfig, hass: HomeAssistant | undefined) {
    if (config.graphic !== undefined) {
      if (!hass) throw new Error('Home Assistant not ready');
      const loaded = await loadIntegrationGraphic(hass, config.graphic, config.version);
      graphic.setAssetUrls(loaded.assetUrls);
      return graphic.load(loaded.graphic.svg, loaded.graphic.config);
    }
    graphic.setAssetRoot(assetRoot(config, document.baseURI));
    return graphic.loadUrl(config.svg ?? '', config.config ?? '');
  }

  async #load(config: CuttleskinCardConfig): Promise<void> {
    const token = {};
    this.#loadToken = token;
    this.#graphic?.destroy();
    this.#graphic = undefined;
    this.#svgAspectRatio = undefined;
    this.#showMessage(undefined);

    const container = this.#render();
    if (!hasSource(config)) {
      // Not set up yet (new card or preview in the card picker): logo and a hint
      container.className = 'placeholder';
      container.innerHTML = LOGO_SVG;
      const hint = document.createElement('p');
      hint.textContent = this.#text(INTEGRATION_ENABLED ? 'placeholder' : 'placeholderFiles');
      container.append(hint);
      return;
    }
    this.#applyAspectRatio();
    if (config.graphic !== undefined && !this.#hass) {
      this.#waitingForHass = true;
      return;
    }
    this.#waitingForHass = false;
    const graphic = create(container);
    try {
      const issues = await this.#loadInto(graphic, config, this.#hass);
      if (this.#loadToken !== token) {
        graphic.destroy();
        return;
      }
      if (issues.length > 0) {
        this.#showMessage(this.#text('invalidEntries', { count: issues.length }));
      }
    } catch (error) {
      graphic.destroy();
      if (this.#loadToken !== token) return;
      this.#showMessage(this.#text('loadFailed', { reason: errorText(error) }));
      return;
    }

    const bounds = graphic.document.contentBounds();
    if (bounds.width > 0 && bounds.height > 0) this.#svgAspectRatio = bounds.width / bounds.height;
    this.#graphic = graphic;
    this.#applyAspectRatio();
    this.#fit();
    this.#update();
  }

  /** Sets changed entity values on the graphic. */
  #update(): void {
    const graphic = this.#graphic;
    const hass = this.#hass;
    const config = this.#config;
    if (!graphic || !hass || !config) return;

    for (const [name, source] of Object.entries(config.variables ?? {})) {
      if (!graphic.variable(name)) continue;
      const value = resolveValue(hass.states[source.entity], source);
      if (value === undefined || Object.is(this.#lastValues.get(name), value)) continue;
      this.#lastValues.set(name, value);
      graphic.setValue(name, value);
    }
  }
}
