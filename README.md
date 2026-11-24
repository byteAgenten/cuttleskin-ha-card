# cuttleskin card for Home Assistant

Dashboard card `custom:cuttleskin-card` that shows a **cuttleskin graphic** – an animated,
data-driven SVG such as a gauge, a clock, a status display or a map – and drives its variables
from the states of Home Assistant entities.

Create and export the graphics in the cuttleskin editor at [cuttleskin.com](https://cuttleskin.com).
The cuttleskin runtime is built in; the card is a single file without further dependencies.

## Install

### HACS

1. HACS → menu (top right) → **Custom repositories**.
2. Repository: `https://github.com/byteAgenten/cuttleskin-ha-card`, type: **Dashboard**.
3. Install **cuttleskin card** and reload the browser.

### Manually

1. Download `cuttleskin-ha-card.js` from the latest
   [release](https://github.com/byteAgenten/cuttleskin-ha-card/releases) and put it into
   `config/www/`.
2. Settings → Dashboards → menu (top right) → Resources → Add resource:
   - URL: `/local/cuttleskin-ha-card.js`
   - Type: JavaScript module
3. Reload the browser. After an update, clear the browser cache or append a version to the URL,
   e.g. `/local/cuttleskin-ha-card.js?v=2`.

Afterwards **cuttleskin** appears in the card picker under the community cards.

## Add a graphic

1. Export the graphic in the cuttleskin editor. The ZIP contains the SVG, the configuration
   (`*.config.json`), a README with the variables and, if used, images in `assets/`.
2. Unpack it into `config/www/cuttleskin/<name>/`. Home Assistant serves `www/` under `/local/`.
3. Add the card and enter the URLs of SVG and configuration.

```yaml
type: custom:cuttleskin-card
svg: /local/cuttleskin/speedometer/speedometer.svg
config: /local/cuttleskin/speedometer/speedometer.config.json
aspect_ratio: 1.5 # optional, width / height; default from the viewBox
variables:
  speed: sensor.car_speed # short form: just the entity
  doorFrontLeft:
    entity: cover.garage_door
    map: { open: true, closed: false } # map states to variable values
  fuel:
    entity: sensor.car
    attribute: fuel_level # attribute instead of the state
```

| Field          | Required | Meaning                                                                              |
| -------------- | -------- | ------------------------------------------------------------------------------------ |
| `svg`          | yes      | URL of the SVG file                                                                  |
| `config`       | yes      | URL of the cuttleskin configuration (JSON)                                           |
| `assets`       | no       | URL of the image folder (relative to the SVG); default: `assets/` next to the SVG    |
| `aspect_ratio` | no       | aspect ratio of the card area; default: from the `viewBox` of the graphic            |
| `variables`    | no       | name of the cuttleskin variable → entity or `{ entity, attribute?, map?, formula? }` |

Without `svg` and `config` (new card, preview in the card picker) the card shows the cuttleskin
logo and a hint.

The visual editor loads the configuration and offers an entity picker per variable. `attribute`,
`map` and `formula` are only available in the code editor; the visual editor keeps them.

### Converting values with `formula`

Every variable can convert its value before it is set. `x` is the value of the entity or
attribute, after `map`:

```yaml
variables:
  hour:
    entity: sensor.clock_hour
    formula: 'x / 24 * 100' # 12 o'clock → 50
  temperature:
    entity: sensor.living_room_temperature
    formula: 'clamp((x - 32) * 5 / 9, -20, 50)' # Fahrenheit → Celsius, limited
  brightness:
    entity: light.hallway
    attribute: brightness
    formula: 'round(x / 255 * 100)' # 0–255 → 0–100 %
```

| Allowed                        | Meaning                                                |
| ------------------------------ | ------------------------------------------------------ |
| `x`                            | the value; `on`/`true` counts as 1, `off`/`false` as 0 |
| numbers, `+ - * / %`, `()`     | arithmetic; `%` stays positive (`-1 % 12` = 11)        |
| `round(a)`, `round(a, n)`      | round, optionally to `n` decimals                      |
| `floor`, `ceil`, `abs`         | round down, round up, absolute value                   |
| `min(a, b, …)`, `max(a, b, …)` | smallest or largest value                              |
| `clamp(a, lo, hi)`             | limit `a` to the range `lo` to `hi`                    |

If the value is not a number (e.g. `unknown`) or the result is not finite, the graphic keeps its
last value. The formula is not evaluated as JavaScript; nothing beyond the table is possible.

### Size and values

- The graphic is always zoomed to fit the card and fitted again on every size change.
- Numbers in states (`"21.5"`) are converted; `map` applies first, then `on` → `true` and
  `off` → `false`.
- `unavailable` and `unknown` are ignored; the graphic keeps its last value.
- Variables the graphic does not know are ignored.

## Limits

- The graphic is display only; clicks trigger no actions.
- The visual editor uses Home Assistant's internal `ha-form` element. If it is not available, use
  the code editor.
- The graphic is inserted into the Home Assistant interface (inside the card's shadow DOM). Only
  use graphics from trusted sources; SVGs are not sanitized.

## Build from source

```sh
npm install
npm run build   # → dist/cuttleskin-ha-card.js
```

The card's source is in `src/`. The cuttleskin runtime is included prebuilt in `vendor/`
(minified and obfuscated) with its type declarations.

## License

[MIT](LICENSE) © byteAgenten GmbH
