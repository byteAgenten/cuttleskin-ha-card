import type { Graphic } from '@cuttleskin/runtime';
import type { ElementActions } from './card-config';

/** Pressing at least this long counts as hold, in milliseconds (as in Home Assistant). */
export const HOLD_TIME = 500;
/** A second tap within this time counts as double tap, in milliseconds. */
export const DOUBLE_TAP_TIME = 250;

type Gesture = 'tap' | 'hold' | 'double_tap';

/**
 * Element of the graphic that `name` refers to: the entry of `elements` with this name (or with
 * this ID and no name), otherwise an element with this ID.
 */
function elementId(graphic: Graphic, name: string): string {
  const entry = (graphic.config.elements ?? []).find(
    (element) => (element.name ?? element.id) === name,
  );
  return entry?.id ?? name;
}

/**
 * Connects the elements named in `actions` with Home Assistant: tap, hold and double tap fire
 * `hass-action` on `target` (the card), which Home Assistant answers like for its own cards, e.g.
 * toggling an entity or opening its more-info dialog. The elements show the hand cursor. Returns
 * a function that removes everything again.
 */
export function bindElementActions(
  graphic: Graphic,
  actions: Readonly<Record<string, ElementActions>>,
  target: HTMLElement,
): () => void {
  const cleanups: (() => void)[] = [];

  for (const [name, config] of Object.entries(actions)) {
    const element = graphic.element(elementId(graphic, name));
    if (!element) continue;

    const fire = (gesture: Gesture) => {
      target.dispatchEvent(
        new CustomEvent('hass-action', {
          bubbles: true,
          composed: true,
          detail: { config, action: gesture },
        }),
      );
    };

    let holdTimer: number | undefined;
    let tapTimer: number | undefined;
    let held = false;

    const stopHold = () => {
      window.clearTimeout(holdTimer);
      holdTimer = undefined;
    };

    const pointerDown = () => {
      held = false;
      if (!config.hold_action) return;
      stopHold();
      holdTimer = window.setTimeout(() => {
        held = true;
        holdTimer = undefined;
        fire('hold');
      }, HOLD_TIME);
    };

    const click = () => {
      // The click that ends a hold is not a tap
      if (held) {
        held = false;
        return;
      }
      if (!config.double_tap_action) {
        if (config.tap_action) fire('tap');
        return;
      }
      if (tapTimer !== undefined) {
        window.clearTimeout(tapTimer);
        tapTimer = undefined;
        fire('double_tap');
        return;
      }
      tapTimer = window.setTimeout(() => {
        tapTimer = undefined;
        if (config.tap_action) fire('tap');
      }, DOUBLE_TAP_TIME);
    };

    cleanups.push(
      element.dom.on('pointerdown', pointerDown),
      element.dom.on('pointerup', stopHold),
      element.dom.on('pointercancel', stopHold),
      element.dom.on('pointerleave', stopHold),
      element.dom.on('click', click),
    );

    const node = element.node;
    const cursor = node.style.cursor;
    node.style.cursor = 'pointer';
    cleanups.push(() => {
      stopHold();
      window.clearTimeout(tapTimer);
      node.style.cursor = cursor;
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
