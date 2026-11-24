/**
 * The parts of Home Assistant's frontend objects used by the card. Home Assistant passes much
 * more; only what is read here is typed.
 */

/** State of one entity, e.g. `hass.states['sensor.speed']`. */
export interface HassEntity {
  readonly entity_id: string;
  /** Always a string, e.g. `'21.5'`, `'on'` or `'unavailable'`. */
  readonly state: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

/** The `hass` object Home Assistant sets on cards and editors on every state change. */
export interface HomeAssistant {
  readonly states: Readonly<Record<string, HassEntity | undefined>>;
  /** Language of the user interface, e.g. `de` or `en-GB`. */
  readonly language?: string;
  /**
   * Request to `/api/<path>` with the user's token; resolves with the parsed JSON. Used for the
   * views of the cuttleskin integration.
   */
  readonly callApi?: <T>(method: 'GET' | 'POST', path: string) => Promise<T>;
  /** WebSocket command, e.g. `auth/sign_path` for image URLs that cannot send the token. */
  readonly callWS?: <T>(message: Readonly<Record<string, unknown>>) => Promise<T>;
}

/** Entry in `window.customCards`, read by the card picker. */
export interface CustomCardEntry {
  readonly type: string;
  readonly name: string;
  readonly description?: string;
  readonly preview?: boolean;
  readonly documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}
