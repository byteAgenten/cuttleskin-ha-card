/**
 * Entry of `cuttleskin-card.js`: registers the card and its editor and announces the card to the
 * card picker of Home Assistant.
 */
import { CARD_TAG, CuttleskinCard, EDITOR_TAG } from './cuttleskin-card';
import { CuttleskinCardEditor } from './cuttleskin-card-editor';
import { cardLanguage, message } from './messages';

export { parseCardConfig, resolveValue } from './card-config';
export type { CuttleskinCardConfig, SourceValue, VariableSource } from './card-config';
export { CARD_TAG, CuttleskinCard, EDITOR_TAG } from './cuttleskin-card';
export { CuttleskinCardEditor } from './cuttleskin-card-editor';

// The module may be loaded twice (e.g. registered as resource with two URLs)
if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, CuttleskinCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, CuttleskinCardEditor);

window.customCards ??= [];
if (!window.customCards.some((entry) => entry.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: 'Cuttleskin',
    // Registered once on load, so in the language of the page at that time
    description: message(cardLanguage(), 'pickerDescription'),
    // The preview renders the card with `getStubConfig`, i.e. without graphic: the logo
    preview: true,
  });
}
