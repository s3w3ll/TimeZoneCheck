'use strict';

// ══════════════════════════════════════════════════════════════════════════════
//  World-map timezone picker
//  Loaded after app.js — uses getUTCOffsetMinutes() and calculate() from app.js
// ══════════════════════════════════════════════════════════════════════════════

const MAP_W = 900;
const MAP_H = 450;

// ── Simplified land polygons ──────────────────────────────────────────────────
// Each entry is an array of [lon, lat] pairs describing one closed landmass.
// Shapes are deliberately simplified to keep code small while staying recognisable.
const LAND_POLYS = [
  // North America + Central America (single clockwise polygon)
  [[-168,71],[-155,73],[-140,70],[-100,73],[-85,72],[-65,68],
   [-52,47],[-65,44],[-75,44],[-80,25],[-90,30],[-97,26],
   [-97,18],[-90,15],[-80,8],[-84,9],[-90,16],[-105,25],
   [-118,32],[-125,48],[-135,58],[-145,62]],
  // South America
  [[-82,12],[-60,12],[-35,-5],[-35,-10],[-50,-35],
   [-68,-55],[-75,-40],[-80,-8]],
  // Europe
  [[-12,36],[30,36],[42,42],[38,60],[25,72],[10,72],[0,65],[-10,55]],
  // Africa
  [[-18,38],[55,12],[45,-10],[35,-35],[10,-35],[-18,5]],
  // Asia — main body (wraps to +180 at the antimeridian)
  [[26,72],[180,72],[180,50],[140,45],[125,22],[110,5],
   [95,5],[80,8],[65,22],[50,12],[40,12],[38,38],[28,42],[26,42]],
  // Arabian Peninsula
  [[36,30],[58,22],[55,12],[40,12]],
  // Indian Subcontinent
  [[65,25],[90,25],[80,8],[68,8]],
  // SE Asia mainland + Malay Peninsula
  [[98,22],[108,18],[104,2],[100,5]],
  // Australia
  [[114,-22],[130,-12],[140,-15],[152,-22],[152,-40],[130,-40],[114,-40]],
  // Greenland
  [[-45,85],[-20,85],[-20,75],[-35,70],[-55,70],[-55,80]],
  // UK
  [[-6,50],[2,52],[2,58],[-6,58]],
  // Japan (Honshu + Kyushu)
  [[130,32],[135,34],[141,40],[142,45],[132,42]],
  // New Zealand
  [[172,-34],[175,-34],[175,-46],[172,-46]],
  // Iceland
  [[-25,63],[-12,63],[-12,66],[-25,66]],
  // Borneo
  [[108,-4],[120,-4],[120,6],[108,6]],
  // Sumatra
  [[95,5],[108,5],[108,-6],[95,-6]],
  // Philippines (approximate)
  [[116,8],[122,8],[122,20],[116,20]],
  // Madagascar
  [[44,-12],[50,-12],[50,-26],[44,-26]],
  // New Guinea
  [[132,-2],[150,-6],[150,-8],[132,-8]],
  // Sri Lanka
  [[80,6],[82,6],[82,10],[80,10]],
  // Cuba
  [[-85,22],[-74,22],[-74,20],[-85,20]],
];

// ── Canonical timezone per UTC-offset ─────────────────────────────────────────
// Key = offset in minutes. Used to snap map clicks to well-known city timezones.
const CANONICAL_TZ = new Map([
  [-720, 'Pacific/Midway'],
  [-660, 'Pacific/Niue'],
  [-600, 'Pacific/Honolulu'],
  [-570, 'Pacific/Marquesas'],
  [-540, 'America/Anchorage'],
  [-480, 'America/Los_Angeles'],
  [-420, 'America/Denver'],
  [-360, 'America/Chicago'],
  [-300, 'America/New_York'],
  [-270, 'America/Caracas'],
  [-240, 'America/Halifax'],
  [-210, 'America/St_Johns'],
  [-180, 'America/Sao_Paulo'],
  [-120, 'America/Noronha'],
  [ -60, 'Atlantic/Azores'],
  [   0, 'Europe/London'],
  [  60, 'Europe/Paris'],
  [ 120, 'Europe/Helsinki'],
  [ 180, 'Europe/Moscow'],
  [ 210, 'Asia/Tehran'],
  [ 240, 'Asia/Dubai'],
  [ 270, 'Asia/Kabul'],
  [ 300, 'Asia/Karachi'],
  [ 330, 'Asia/Kolkata'],
  [ 345, 'Asia/Kathmandu'],
  [ 360, 'Asia/Dhaka'],
  [ 390, 'Asia/Yangon'],
  [ 420, 'Asia/Bangkok'],
  [ 480, 'Asia/Singapore'],
  [ 540, 'Asia/Tokyo'],
  [ 570, 'Australia/Adelaide'],
  [ 600, 'Australia/Sydney'],
  [ 660, 'Pacific/Noumea'],
  [ 720, 'Pacific/Auckland'],
  [ 780, 'Pacific/Apia'],
]);

// ── Coordinate helpers ────────────────────────────────────────────────────────

function ll2xy(lon, lat) {
  return [
    ((lon + 180) / 360) * MAP_W,
    ((90  - lat) / 180) * MAP_H,
  ];
}

function mapXToLon(mx) {
  return (mx / MAP_W) * 360 - 180;
}

function clientToSVGX(evt, svgEl) {
  const r = svgEl.getBoundingClientRect();
  return (evt.clientX - r.left) * (MAP_W / r.width);
}

// ── Timezone lookup ───────────────────────────────────────────────────────────
// Lazy cache: offset-minutes → best matching Intl timezone name
let _tzCache = null;

function buildTZCache() {
  if (_tzCache) return _tzCache;
  _tzCache = new Map();
  for (const tz of Intl.supportedValuesOf('timeZone')) {
    const mins = getUTCOffsetMinutes(tz);
    // Store first match; overwrite with canonical if available
    if (!_tzCache.has(mins) || CANONICAL_TZ.get(mins) === tz) {
      _tzCache.set(mins, tz);
    }
  }
  return _tzCache;
}

function lonToOffsetMins(lon) {
  // Round to nearest 15-minute UTC offset
  return Math.round((lon / 15) * 4) / 4 * 60;
}

function findTimezoneForLon(lon) {
  const target = lonToOffsetMins(lon);
  if (CANONICAL_TZ.has(target)) return CANONICAL_TZ.get(target);

  // Nearest-match fallback
  const cache = buildTZCache();
  let best = 'UTC', bestDelta = Infinity;
  for (const [mins, tz] of cache) {
    const d = Math.abs(mins - target);
    if (d < bestDelta) { bestDelta = d; best = tz; }
  }
  return best;
}

function fmtOffset(tz) {
  const m = getUTCOffsetMinutes(tz);
  const s = m >= 0 ? '+' : '-';
  const a = Math.abs(m);
  const h = Math.floor(a / 60);
  const n = a % 60;
  return `UTC${s}${h}${n ? ':' + String(n).padStart(2, '0') : ''}`;
}

// ── SVG construction ──────────────────────────────────────────────────────────

function poly2d(pts) {
  return pts.map(([lon, lat], i) => {
    const [x, y] = ll2xy(lon, lat);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join('') + 'Z';
}

function buildGridlinesSVG() {
  const out = [];
  for (let lon = -165; lon <= 180; lon += 15) {
    const x   = ((lon + 180) / 360) * MAP_W;
    const hr  = lon / 15;
    const lbl = hr > 0 ? `+${hr}` : String(hr);
    out.push(
      `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${MAP_H}" class="map-grid"/>`,
      `<text x="${x.toFixed(1)}" y="${MAP_H - 5}" class="map-grid-label">${lbl}</text>`,
    );
  }
  // Equator
  out.push(`<line x1="0" y1="${MAP_H / 2}" x2="${MAP_W}" y2="${MAP_H / 2}" class="map-equator"/>`);
  return out.join('');
}

function createMapSVG() {
  const land = LAND_POLYS.map(p => `<path d="${poly2d(p)}" class="map-land"/>`).join('');
  return `
<svg id="world-map-svg"
  viewBox="0 0 ${MAP_W} ${MAP_H}"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="World map for timezone selection"
  style="width:100%;height:auto;display:block;cursor:crosshair;border-radius:6px;">
  <rect width="${MAP_W}" height="${MAP_H}" class="map-ocean"/>
  ${buildGridlinesSVG()}
  ${land}
  <g id="map-pins" aria-hidden="true"></g>
  <line id="map-hover-line" class="map-hover-line"
    x1="0" y1="0" x2="0" y2="${MAP_H}" opacity="0"/>
  <rect width="${MAP_W}" height="${MAP_H}" fill="transparent" id="map-overlay"/>
</svg>`;
}

// ── Pin rendering ─────────────────────────────────────────────────────────────

function pinSVG(tz, cls, label) {
  const offsetMins = getUTCOffsetMinutes(tz);
  const approxLon  = (offsetMins / 60) * 15;
  const [px, py]   = ll2xy(approxLon, 35);
  const cx = Math.max(14, Math.min(MAP_W - 14, px));
  const cy = Math.max(14, Math.min(MAP_H - 25, py));
  const stemY2 = Math.min(cy + 48, MAP_H - 4);

  return `<g class="map-pin ${cls}">
    <line x1="${cx.toFixed(1)}" y1="${(cy + 9).toFixed(1)}"
          x2="${cx.toFixed(1)}" y2="${stemY2.toFixed(1)}" class="pin-stem"/>
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="9" class="pin-dot"/>
    <text x="${cx.toFixed(1)}" y="${(Math.max(10, cy - 14)).toFixed(1)}"
          class="pin-label">${label}</text>
  </g>`;
}

function refreshPins() {
  const el = document.getElementById('map-pins');
  if (!el) return;
  el.innerHTML = '';
  if (window.mapState.homeTZ)
    el.insertAdjacentHTML('beforeend', pinSVG(window.mapState.homeTZ, 'pin-home', 'Home'));
  if (window.mapState.awayTZ)
    el.insertAdjacentHTML('beforeend', pinSVG(window.mapState.awayTZ, 'pin-away', 'Away'));
}

// ── State & UI helpers ────────────────────────────────────────────────────────

window.mapState = { phase: 'home', homeTZ: null, awayTZ: null };

function syncDropdown(id, tz) {
  const sel = document.getElementById(id);
  if (sel && [...sel.options].some(o => o.value === tz)) sel.value = tz;
}

function updateTZTag(id, tz) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = tz
    ? `${tz.replace(/_/g, ' ')} (${fmtOffset(tz)})`
    : 'Click map to select';
}

function updatePrompt() {
  const el = document.getElementById('map-prompt');
  if (!el) return;
  const { phase, homeTZ } = window.mapState;
  const { awayTZ } = window.mapState;
  if (phase === 'home') {
    el.className   = 'map-prompt map-prompt-home';
    el.textContent = 'Click your home timezone on the map';
  } else if (!awayTZ) {
    el.className   = 'map-prompt map-prompt-away';
    el.textContent =
      `Home: ${homeTZ.replace(/_/g, ' ')} (${fmtOffset(homeTZ)})` +
      ' \u2014 click the away timezone';
  } else {
    el.className   = 'map-prompt map-prompt-away';
    el.textContent =
      `Home: ${homeTZ.replace(/_/g, ' ')} (${fmtOffset(homeTZ)})` +
      ` \u2014 Away: ${awayTZ.replace(/_/g, ' ')} (${fmtOffset(awayTZ)})` +
      ' \u2014 click map to change away';
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

function onMapClick(evt) {
  const svg = document.getElementById('world-map-svg');
  const mx  = clientToSVGX(evt, svg);
  const tz  = findTimezoneForLon(mapXToLon(mx));

  if (window.mapState.phase === 'home') {
    window.mapState.homeTZ = tz;
    window.mapState.phase  = 'away';
    syncDropdown('tz1', tz);
    updateTZTag('tz1-tag', tz);
    refreshPins();
    updatePrompt();
  } else {
    window.mapState.awayTZ = tz;
    syncDropdown('tz2', tz);
    updateTZTag('tz2-tag', tz);
    refreshPins();
    updatePrompt();
    calculate();   // auto-recalculate (from app.js)
  }
}

function onMapHover(evt) {
  const svg = document.getElementById('world-map-svg');
  const mx  = clientToSVGX(evt, svg);
  const tz  = findTimezoneForLon(mapXToLon(mx));

  const info = document.getElementById('map-tz-info');
  if (info) info.textContent = `${tz.replace(/_/g, ' ')}  ${fmtOffset(tz)}`;

  const line = document.getElementById('map-hover-line');
  if (line) {
    line.setAttribute('x1', mx.toFixed(1));
    line.setAttribute('x2', mx.toFixed(1));
    line.setAttribute('opacity', '1');
  }
}

function onMapLeave() {
  const info = document.getElementById('map-tz-info');
  if (info) info.textContent = '';
  const line = document.getElementById('map-hover-line');
  if (line) line.setAttribute('opacity', '0');
}

// ── Public: initMapMode ───────────────────────────────────────────────────────

function initMapMode() {   // eslint-disable-line no-unused-vars
  const container = document.getElementById('map-container');
  if (!container) return;

  // Reset state
  window.mapState = { phase: 'home', homeTZ: null, awayTZ: null };

  // Build inner HTML
  container.innerHTML = `
    <div id="map-prompt" class="map-prompt map-prompt-home">
      Click your home timezone on the map
    </div>
    ${createMapSVG()}
    <div id="map-tz-info" class="map-tz-info" aria-live="polite"></div>
  `;

  updateTZTag('tz1-tag', null);
  updateTZTag('tz2-tag', null);

  // Pre-warm timezone cache in idle time to avoid first-click lag
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(buildTZCache);
  } else {
    setTimeout(buildTZCache, 100);
  }

  const svg = document.getElementById('world-map-svg');
  svg.addEventListener('click',      onMapClick);
  svg.addEventListener('mousemove',  onMapHover);
  svg.addEventListener('mouseleave', onMapLeave);
}
