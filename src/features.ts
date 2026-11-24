/**
 * Graphics of the cuttleskin portal by ID (`graphic:`), loaded through the cuttleskin Home
 * Assistant integration. The public card (byteAgenten/cuttleskin-ha-card) is built with this
 * switched off: there users load exported files (`svg`, `config`) and the integration is not
 * published. `scripts/build-public.sh` sets it to `false`.
 */
// Typed as boolean, so that code behind the switch is still checked while it is off
export const INTEGRATION_ENABLED: boolean = false;
