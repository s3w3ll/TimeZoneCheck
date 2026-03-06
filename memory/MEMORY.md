# TimeZoneCheck — Project Memory

## Project Overview
Static HTML/CSS/JS app (no build step, no npm) hosted on GitHub Pages.
Single-page tool for visualising timezone overlap between two people's working hours.

## File Structure
```
index.html   — markup; loads app.js then map.js
style.css    — all styles
app.js       — core logic (UTC math, timeline renderer, mode toggle)
map.js       — world map timezone picker (depends on app.js globals)
```

## Architecture Decisions

### No modules — plain globals
All scripts use `'use strict'` but are regular `<script>` tags (not `type="module"`).
Top-level `function` declarations are automatically on `window`, so `map.js` can call
`getUTCOffsetMinutes()` and `calculate()` from `app.js` without imports.

### Timezone math (app.js)
- `getUTCOffsetMinutes(tz)` — uses `Intl.DateTimeFormat` with `shortOffset` to parse `GMT±H:MM`.
- `localToUTC(timeStr, tz)` — converts `HH:MM` local string to UTC minutes from midnight.
  Result can be negative (e.g. Auckland 8am ≈ −720) or >1440 (spans two UTC days).
- Overnight schedules handled: if `end <= start`, add 1440.
- Timeline spans the minimum UTC day range covering both timezones' windows.

### Timeline renderer (app.js)
- `renderTimeline()` builds a flex-based horizontal bar chart inside `#timeline`.
- Rows: Home axis (top) → Home bar → Overlap bar → Away bar → Away axis (bottom).
- `makeAxisRow()` draws local-day bands + hour tick labels for each timezone.
- `addHourGridlines()` adds subtle white hour lines inside each bar.
- `pct(minutes, total)` formats percentages to 5 decimal places for pixel-accurate positioning.

### Two-mode UI (form vs world map)
- Toggle controlled by `setMode(mode)` in `app.js`.
- **Form mode**: `.tz-field` (timezone `<select>`) visible; `.map-tz-tag` hidden; `#form-actions` visible; `#map-container` hidden.
- **Map mode**: opposite — dropdowns hidden, coloured tag shows selected TZ, map shows.
- The same `<select id="tz1">` / `<select id="tz2">` elements back both modes.
  Map clicks call `syncDropdown('tz1', tz)` so `calculate()` reads the right value unchanged.
- Auto-recalculate in map mode: `change` listeners on all 4 time inputs, only fires if `mapState.awayTZ` is set.

### World map (map.js)
- D3 Natural Earth projection (`d3.geoNaturalEarth1().fitExtent(...)`) via `d3@7` CDN UMD bundle.
- Country outlines fetched async from `world-atlas@2/countries-110m.json` (topojson-client@3).
  - `topojson.feature()` for land fill, `topojson.mesh()` for internal borders.
- Graticule: `d3.geoGraticule().step([15,15])` for curved 15° grid lines.
- Click-to-longitude via `projection.invert([x,y])` — handles curved meridians correctly.
- Hover line: curved meridian path drawn via `geoPath`.
- Timezone detection: longitude → nearest 15-min UTC offset → `CANONICAL_TZ` Map → fallback nearest-match scan.
- `_tzCache` (Map: offsetMins → tz name) is built lazily via `requestIdleCallback`.
- On `initMapMode()`: browser TZ auto-detected (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
  and pre-set as home TZ; phase starts at `'away'` — user only needs one click.
- "Change Home" button (in map container) resets phase to `'home'` for reselection.
- Pins placed at approximate UTC-offset longitude via `projection([lon, 35])`.
- Note: `d3-geo@3` is ESM-only (no UMD) — must use full `d3@7` bundle.

## CSS Conventions
- CSS custom properties on `:root`: `--tz1-bg/muted/strong`, `--tz2-bg/muted/strong`, `--overlap`, `--radius`.
- `.hidden { display: none !important; }` — global utility class used for all show/hide.
- Colors also mirrored as JS constants in `COLORS` object in app.js.

## Key Constants (app.js)
```js
DEFAULT_START = '08:00'
DEFAULT_END   = '17:00'
COLORS = { tz1Muted, tz1Strong, tz2Muted, tz2Strong, overlap, noOverlapTint }
```

## Deployment
- Hosted on GitHub Pages from the `main` branch root.
- No build required — push directly.
- See `docs/plans/` for migration notes.

## Dev Server
`.claude/launch.json` runs `python -m http.server 5500` for local preview.

## Patterns to Follow
- Keep everything in the three main files — avoid new files unless there's a clear module boundary.
- New rendering features go in `app.js`; map-specific code stays in `map.js`.
- CDN deps in use: `d3@7` (UMD) + `topojson-client@3` + `world-atlas@2` (JSON fetch). App requires internet for map; form/dropdown mode is self-contained.
- Use `Intl` APIs for all timezone/date work rather than manual tables.
