'use strict';

// ══════════════════════════════════════════════════════════════════════════════
//  World-map timezone picker
//  Loaded after app.js — uses getUTCOffsetMinutes() and calculate() from app.js
//  Uses d3-geo (global `d3`) and topojson-client (global `topojson`) from CDN.
// ══════════════════════════════════════════════════════════════════════════════

const MAP_W = 900;
const MAP_H = 450;

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

// ── D3 projection (Natural Earth) ─────────────────────────────────────────────
// Initialised once; reused for all coordinate conversions and path drawing.
let _projection = null;
let _path       = null;

function getProjection() {
  if (_projection) return _projection;
  _projection = d3.geoNaturalEarth1()
    .fitExtent([[0, 0], [MAP_W, MAP_H]], { type: 'Sphere' });
  _path = d3.geoPath(_projection);
  return _projection;
}

function getPath() {
  getProjection();
  return _path;
}

// ── Coordinate helpers ────────────────────────────────────────────────────────

function clientToSVGPoint(evt, svgEl) {
  const r = svgEl.getBoundingClientRect();
  return [
    (evt.clientX - r.left) * (MAP_W / r.width),
    (evt.clientY - r.top)  * (MAP_H / r.height),
  ];
}

// Longitude of SVG x-coordinate via projection inverse (handles curved meridians).
function svgPointToLon(pt) {
  const proj = getProjection();
  const geo  = proj.invert(pt);
  return geo ? geo[0] : null;
}

// ── Timezone lookup ───────────────────────────────────────────────────────────
let _tzCache = null;

function buildTZCache() {
  if (_tzCache) return _tzCache;
  _tzCache = new Map();
  for (const tz of Intl.supportedValuesOf('timeZone')) {
    const mins = getUTCOffsetMinutes(tz);
    if (!_tzCache.has(mins) || CANONICAL_TZ.get(mins) === tz) {
      _tzCache.set(mins, tz);
    }
  }
  return _tzCache;
}

function lonToOffsetMins(lon) {
  return Math.round((lon / 15) * 4) / 4 * 60;
}

function findTimezoneForLon(lon) {
  const target = lonToOffsetMins(lon);
  if (CANONICAL_TZ.has(target)) return CANONICAL_TZ.get(target);
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

function createMapSVG() {
  const proj = getProjection();
  const graticule = d3.geoGraticule().step([15, 15])();
  const sphere     = { type: 'Sphere' };
  const gratPath   = getPath()(graticule) || '';
  const spherePath = getPath()(sphere)    || '';

  return `
<svg id="world-map-svg"
  viewBox="0 0 ${MAP_W} ${MAP_H}"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="World map for timezone selection"
  style="width:100%;height:auto;display:block;cursor:crosshair;border-radius:6px;">
  <path class="map-sphere" d="${spherePath}"/>
  <path class="map-graticule" d="${gratPath}"/>
  <g id="map-land"    aria-hidden="true"></g>
  <g id="map-borders" aria-hidden="true"></g>
  <g id="map-pins"    aria-hidden="true"></g>
  <path id="map-hover-line" class="map-hover-line" d="" opacity="0"/>
  <path class="map-sphere-outline" d="${spherePath}"/>
  <rect width="${MAP_W}" height="${MAP_H}" fill="transparent" id="map-overlay"/>
</svg>`;
}

// Async: fetch world-atlas TopoJSON and paint countries + borders into the SVG.
async function loadAndRenderCountries() {
  const url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  let topo;
  try {
    const res = await fetch(url);
    topo = await res.json();
  } catch (e) {
    console.warn('TimeZoneCheck: could not load world-atlas:', e);
    return;
  }

  const land    = topojson.feature(topo, topo.objects.land);
  const borders = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);

  const landEl    = document.getElementById('map-land');
  const bordersEl = document.getElementById('map-borders');
  if (!landEl || !bordersEl) return;

  const p = getPath();
  landEl.innerHTML    = `<path class="map-land" d="${p(land) || ''}"/>`;
  bordersEl.innerHTML = `<path class="map-borders" d="${p(borders) || ''}"/>`;
}

// ── Pin rendering ─────────────────────────────────────────────────────────────

function pinSVG(tz, cls, label) {
  const offsetMins = getUTCOffsetMinutes(tz);
  const approxLon  = (offsetMins / 60) * 15;
  const proj       = getProjection();
  const [px, py]   = proj([approxLon, 35]) || [MAP_W / 2, MAP_H / 2];
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

// ── Hover meridian ────────────────────────────────────────────────────────────
// Draw a curved meridian at the hovered longitude using the D3 path generator.
function meridianPath(lon) {
  const line = { type: 'LineString', coordinates: [] };
  for (let lat = 90; lat >= -90; lat -= 2) {
    line.coordinates.push([lon, lat]);
  }
  return getPath()(line) || '';
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
  const { phase, homeTZ, awayTZ } = window.mapState;
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
  const pt  = clientToSVGPoint(evt, svg);
  const lon = svgPointToLon(pt);
  if (lon === null) return;           // click outside sphere
  const tz = findTimezoneForLon(lon);

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
    calculate();
  }
}

function onMapHover(evt) {
  const svg = document.getElementById('world-map-svg');
  const pt  = clientToSVGPoint(evt, svg);
  const lon = svgPointToLon(pt);

  if (lon === null) {
    onMapLeave();
    return;
  }

  const tz = findTimezoneForLon(lon);
  const info = document.getElementById('map-tz-info');
  if (info) info.textContent = `${tz.replace(/_/g, ' ')}  ${fmtOffset(tz)}`;

  const line = document.getElementById('map-hover-line');
  if (line) {
    line.setAttribute('d', meridianPath(lon));
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

  // Build inner HTML (sync — country paths filled in async below)
  container.innerHTML = `
    <div id="map-prompt" class="map-prompt map-prompt-home">
      Click your home timezone on the map
    </div>
    ${createMapSVG()}
    <div id="map-tz-info" class="map-tz-info" aria-live="polite"></div>
  `;

  updateTZTag('tz1-tag', null);
  updateTZTag('tz2-tag', null);

  // Load country shapes (async — does not block map interactivity)
  loadAndRenderCountries();

  // Pre-warm TZ cache during idle time
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
