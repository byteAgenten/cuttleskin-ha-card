import type { HomeAssistant } from './hass';

/** Base path of the views of the cuttleskin integration (Python, part of Home Assistant). */
export const INTEGRATION_PATH = 'cuttleskin/graphics';

/** Validity of signed image paths in seconds; images resolved later need a valid signature. */
const SIGNED_PATH_SECONDS = 24 * 60 * 60;

/** Graphic as returned by `GET /api/cuttleskin/graphics/<id>`. */
export interface IntegrationGraphic {
  readonly id: string;
  readonly version: number;
  readonly svg: string;
  readonly config: Record<string, unknown>;
  /** File names of the images. */
  readonly assets: readonly string[];
}

/** Path of the graphic view below `/api/`, with a fixed version if given. */
export function graphicPath(graphicId: string, version?: number): string {
  const path = `${INTEGRATION_PATH}/${encodeURIComponent(graphicId)}`;
  return version === undefined ? path : `${path}?version=${String(version)}`;
}

/** Absolute path of an image of a version, served by the integration. */
export function assetPath(graphicId: string, version: number, name: string): string {
  return `/api/${INTEGRATION_PATH}/${encodeURIComponent(graphicId)}/versions/${String(version)}/assets/${encodeURIComponent(name)}`;
}

/**
 * Text of an error of `callApi`/`callWS`: Home Assistant rejects with an `Error`, a string or
 * an object with `message`, `error` or `body.message`, depending on the call and version.
 */
export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    const body = record.body;
    if (typeof body === 'object' && body !== null) {
      const message = (body as Record<string, unknown>).message;
      if (typeof message === 'string') return message;
    }
    for (const key of ['message', 'error'] as const) {
      const value = record[key];
      if (typeof value === 'string') return value;
    }
  }
  return String(error);
}

/**
 * Loads a graphic through the integration: content with the user's token, images as signed
 * paths, because `<image href>` cannot send the token. Throws if the integration is missing.
 */
export async function loadIntegrationGraphic(
  hass: HomeAssistant,
  graphicId: string,
  version?: number,
): Promise<{ graphic: IntegrationGraphic; assetUrls: Record<string, string> }> {
  const { callApi, callWS } = hass;
  if (!callApi || !callWS) throw new Error('Home Assistant API not available');
  const graphic = await callApi<IntegrationGraphic>('GET', graphicPath(graphicId, version));
  const entries = await Promise.all(
    graphic.assets.map(async (name): Promise<[string, string]> => {
      const signed = await callWS<{ path: string }>({
        type: 'auth/sign_path',
        path: assetPath(graphicId, graphic.version, name),
        expires: SIGNED_PATH_SECONDS,
      });
      return [name, signed.path];
    }),
  );
  return { graphic, assetUrls: Object.fromEntries(entries) };
}
