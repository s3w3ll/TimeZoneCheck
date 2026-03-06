'use strict';

// ══════════════════════════════════════════════════════════════════════════════
//  World-map timezone picker — timezone-boundary-builder edition
//  Data: timezone-map.json (local TopoJSON simplified from 2025c release data)
//  One SVG <path data-tz="…"> per timezone polygon; hover intensifies colour
//  and shows a tooltip; click selects the timezone.
//  Loaded after app.js — uses getUTCOffsetMinutes() and calculate() from there.
// ══════════════════════════════════════════════════════════════════════════════

const MAP_W = 900;
const MAP_H = 450;

// ── D3 projection (Natural Earth) ─────────────────────────────────────────────
// Rotated -15° so 15°E is centred: UTC-11 sits at the left edge, UTC+13 right.

let _projection = null;
let _path       = null;

function getProjection() {
  if (_projection) return _projection;
  _projection = d3.geoNaturalEarth1()
    .rotate([-15, 0])
    .fitExtent([[0, 0], [MAP_W, MAP_H]], { type: 'Sphere' });
  _path = d3.geoPath(_projection).digits(0); // integer coords → compact SVG
  return _projection;
}

function getPath() {
  getProjection();
  return _path;
}

// ── Timezone colour helpers ───────────────────────────────────────────────────
// UTC offset −12 … +14 is mapped to hue 20°…320° (300° arc, no full loop).
// Pale = very low saturation; hover = vivid but not harsh.

function tzOffsetHue(tz) {
  const m = getUTCOffsetMinutes(tz);
  const t = ((m / 60) + 12) / 26;          // normalise −12..+14 → 0..1
  return Math.round(20 + t * 300);          // hue 20 (amber) … 320 (violet)
}

function tzColorPale(tz) {
  return `hsl(${tzOffsetHue(tz)},22%,88%)`;
}

function tzColorHover(tz) {
  return `hsl(${tzOffsetHue(tz)},62%,50%)`;
}

// ── UTC offset label ──────────────────────────────────────────────────────────

function fmtOffset(tz) {
  const m = getUTCOffsetMinutes(tz);
  const s = m >= 0 ? '+' : '-';
  const a = Math.abs(m);
  return `UTC${s}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}`;
}

// ── SVG skeleton ──────────────────────────────────────────────────────────────

function createMapSVG() {
  const graticule  = d3.geoGraticule().step([15, 15])();
  const sphere     = { type: 'Sphere' };
  const gratPath   = getPath()(graticule) || '';
  const spherePath = getPath()(sphere)    || '';

  return `
<svg id="world-map-svg"
  viewBox="0 0 ${MAP_W} ${MAP_H}"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="World map for timezone selection"
  style="width:100%;height:auto;display:block;border-radius:6px;cursor:default;">
  <path class="map-sphere"         d="${spherePath}"/>
  <path class="map-graticule"      d="${gratPath}"/>
  <g    id="tz-polygons"           aria-hidden="true"></g>
  <path class="map-sphere-outline" d="${spherePath}"/>
</svg>`;
}

// ── Load and render timezone polygons ─────────────────────────────────────────
// Fetches timezone-map.json (216 KB TopoJSON), renders a <path> per feature,
// then reapplies any selection highlights already in mapState.

async function loadAndRenderTimezones() {
  let topo;
  try {
    const res = await fetch('timezone-map.json');
    topo = await res.json();
  } catch (e) {
    console.warn('TimeZoneCheck: could not load timezone-map.json:', e);
    return;
  }

  // Mapshaper names the object after the source file — grab first key safely
  const objKey       = Object.keys(topo.objects)[0];
  const { features } = topojson.feature(topo, topo.objects[objKey]);
  const p            = getPath();

  const parts = features.map(f => {
    const tzid = f.properties && f.properties.tzid;
    if (!tzid) return '';
    const d = p(f);
    if (!d) return '';
    return `<path class="tz-polygon" data-tz="${tzid}" d="${d}" style="fill:${tzColorPale(tzid)}"/>`;
  });

  const el = document.getElementById('tz-polygons');
  if (el) {
    el.innerHTML = parts.join('');
    applyHighlights();   // paint home/away TZ if already set
  }
}

// ── Selection highlights ──────────────────────────────────────────────────────
// Walks every .tz-polygon and paints home (blue) / away (red) / pale (neutral).
// Safe to call before polygons exist — querySelectorAll returns empty list.

function applyHighlights() {
  const { homeTZ, awayTZ } = window.mapState || {};
  document.querySelectorAll('.tz-polygon').forEach(el => {
    const tz = el.dataset.tz;
    if (tz === homeTZ) {
      el.style.fill = 'rgba(32,96,224,0.72)';
    } else if (tz === awayTZ) {
      el.style.fill = 'rgba(224,48,48,0.72)';
    } else if (el !== _hoveredPoly) {
      el.style.fill = tzColorPale(tz);
    }
  });
}

// Public alias kept for compatibility with any external callers.
function refreshPins() { applyHighlights(); }

// ── Tooltip ───────────────────────────────────────────────────────────────────

function showTooltip(evt, tz) {
  const tt = document.getElementById('map-tooltip');
  if (!tt) return;

  const cRect = document.getElementById('map-container').getBoundingClientRect();
  tt.innerHTML =
    `<strong>${tz.replace(/_/g, '\u200b').replace(/\//g, ' / ')}</strong>` +
    `<span>${fmtOffset(tz)}</span>`;
  tt.classList.add('visible');

  // Prefer above-right of cursor; flip if near edges
  const tw = tt.offsetWidth  || 170;
  const th = tt.offsetHeight || 46;
  const mg = 14;

  let left = evt.clientX - cRect.left + mg;
  let top  = evt.clientY - cRect.top  - th - mg;

  if (left + tw > cRect.width  - 8) left = evt.clientX - cRect.left - tw - mg;
  if (top < 6)                        top  = evt.clientY - cRect.top  + mg;

  tt.style.left = `${left}px`;
  tt.style.top  = `${top}px`;
}

function hideTooltip() {
  const tt = document.getElementById('map-tooltip');
  if (tt) tt.classList.remove('visible');
}

// ── State helpers ─────────────────────────────────────────────────────────────

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

// ── Hover / click handlers ────────────────────────────────────────────────────

let _hoveredPoly = null;

// Restores a polygon to its correct colour (selected or pale).
function _restorePolyColor(el) {
  const tz = el.dataset.tz;
  const { homeTZ, awayTZ } = window.mapState || {};
  if      (tz === homeTZ) el.style.fill = 'rgba(32,96,224,0.72)';
  else if (tz === awayTZ) el.style.fill = 'rgba(224,48,48,0.72)';
  else                    el.style.fill = tzColorPale(tz);
}

function onMapClick(evt) {
  const target = evt.target.closest('.tz-polygon');
  if (!target) return;
  const tz = target.dataset.tz;
  if (!tz) return;

  if (window.mapState.phase === 'home') {
    window.mapState.homeTZ = tz;
    window.mapState.phase  = 'away';
    syncDropdown('tz1', tz);
    updateTZTag('tz1-tag', tz);
    applyHighlights();
  } else {
    window.mapState.awayTZ = tz;
    syncDropdown('tz2', tz);
    updateTZTag('tz2-tag', tz);
    applyHighlights();
    calculate();
  }
}

function onMapHover(evt) {
  const newTarget = evt.target.closest('.tz-polygon');

  if (newTarget !== _hoveredPoly) {
    if (_hoveredPoly) _restorePolyColor(_hoveredPoly);
    _hoveredPoly = newTarget;

    if (newTarget) {
      const tz = newTarget.dataset.tz;
      const { homeTZ, awayTZ } = window.mapState || {};
      if (tz !== homeTZ && tz !== awayTZ) {
        newTarget.style.fill = tzColorHover(tz);
      }
    }
  }

  if (_hoveredPoly) showTooltip(evt, _hoveredPoly.dataset.tz);
  else              hideTooltip();
}

function onMapLeave() {
  if (_hoveredPoly) { _restorePolyColor(_hoveredPoly); _hoveredPoly = null; }
  hideTooltip();
}

// ── initMapMode ───────────────────────────────────────────────────────────────

function initMapMode() {   // eslint-disable-line no-unused-vars
  const container = document.getElementById('map-container');
  if (!container) return;

  const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  window.mapState = { phase: 'away', homeTZ: browserTZ, awayTZ: null };

  container.innerHTML = `
    <div class="map-prompt-row">
      <button id="map-change-home" class="map-change-home-btn" type="button">Change Home</button>
    </div>
    ${createMapSVG()}
    <div id="map-tooltip" class="map-tooltip" role="tooltip"></div>
  `;

  syncDropdown('tz1', browserTZ);
  updateTZTag('tz1-tag', browserTZ);
  updateTZTag('tz2-tag', null);

  document.getElementById('map-change-home').addEventListener('click', () => {
    if (_hoveredPoly) { _restorePolyColor(_hoveredPoly); _hoveredPoly = null; }
    hideTooltip();
    window.mapState = { phase: 'home', homeTZ: null, awayTZ: null };
    updateTZTag('tz1-tag', null);
    updateTZTag('tz2-tag', null);
    applyHighlights();
    document.getElementById('results').classList.add('hidden');
  });

  // Async — does not block SVG interactivity
  loadAndRenderTimezones();

  const svg = document.getElementById('world-map-svg');
  svg.addEventListener('click',      onMapClick);
  svg.addEventListener('mousemove',  onMapHover);
  svg.addEventListener('mouseleave', onMapLeave);
}
