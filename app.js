'use strict';

const DEFAULT_START = '08:00';
const DEFAULT_END   = '17:00';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const COLORS = {
  tz1Muted:  '#f4a0a0',
  tz1Strong: '#e03030',
  tz2Muted:  '#90b4f0',
  tz2Strong: '#2060e0',
  overlap:   '#9040c0',
  noOverlapTint: 'rgba(224,48,48,0.15)',
};

// Returns offset in minutes such that: local_minutes = UTC_minutes + offset
// e.g. New York (UTC-5) → -300, Kolkata (UTC+5:30) → +330
function getUTCOffsetMinutes(tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date());

  const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match  = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return 0;

  const sign = match[1] === '+' ? 1 : -1;
  return sign * (parseInt(match[2]) * 60 + parseInt(match[3] ?? '0'));
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Converts a local HH:MM string in a given timezone to UTC minutes from midnight.
// Result can be negative (e.g. Sydney 8am = -180 UTC min) or > 1440 (e.g. Hawaii 5pm = 1620).
function localToUTC(timeStr, tz) {
  return timeToMinutes(timeStr) - getUTCOffsetMinutes(tz);
}

function populateDropdowns() {
  const zones = Intl.supportedValuesOf('timeZone');
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;

  ['tz1', 'tz2'].forEach(id => {
    const sel = document.getElementById(id);
    zones.forEach(tz => {
      const opt = document.createElement('option');
      opt.value       = tz;
      opt.textContent = tz.replace(/_/g, ' ');
      opt.selected    = (tz === local);
      sel.appendChild(opt);
    });
  });

  document.getElementById('start1').value = DEFAULT_START;
  document.getElementById('end1').value   = DEFAULT_END;
  document.getElementById('start2').value = DEFAULT_START;
  document.getElementById('end2').value   = DEFAULT_END;
}

function pct(minutes, total) {
  return (minutes / total * 100).toFixed(5) + '%';
}

// Build an array of {l, w, c} segments for a TZ working-hours bar.
function tzSegments(tlMin, tlMax, activeStart, activeEnd, muted, strong) {
  const total  = tlMax - tlMin;
  const aStart = Math.max(activeStart, tlMin);
  const aEnd   = Math.min(activeEnd,   tlMax);
  const segs   = [];

  if (aStart > tlMin)
    segs.push({ l: pct(0, total),               w: pct(aStart - tlMin,    total), c: muted  });
  if (aEnd > aStart)
    segs.push({ l: pct(aStart - tlMin, total),  w: pct(aEnd   - aStart,   total), c: strong });
  if (aEnd < tlMax)
    segs.push({ l: pct(aEnd - tlMin,   total),  w: pct(tlMax  - aEnd,     total), c: muted  });

  return segs;
}

// Build overlap segments (only if hasOverlap is true).
function overlapSegments(tlMin, tlMax, oStart, oEnd, hasOverlap) {
  if (!hasOverlap) return [];
  const total = tlMax - tlMin;
  const s = Math.max(oStart, tlMin);
  const e = Math.min(oEnd,   tlMax);
  if (e <= s) return [];
  return [{ l: pct(s - tlMin, total), w: pct(e - s, total), c: COLORS.overlap }];
}

function makeSeg(l, w, c) {
  const d = document.createElement('div');
  d.className        = 'bar-seg';
  d.style.left       = l;
  d.style.width      = w;
  d.style.background = c;
  return d;
}

function addDayDividers(barsEl, numDays, totalMinutes) {
  for (let i = 1; i < numDays; i++) {
    const d = document.createElement('div');
    d.className  = 'day-divider';
    // Place divider at i/numDays of the bar width — kept < 100% to avoid clip edge
    d.style.left = pct(i * 1440, totalMinutes);
    barsEl.appendChild(d);
  }
}

function makeBarRow(labelText, labelClass, segments, numDays, totalMinutes) {
  const row  = document.createElement('div');
  row.className = 'tl-row';

  const lbl  = document.createElement('div');
  lbl.className   = `tl-label ${labelClass}`;
  lbl.textContent = labelText;
  row.appendChild(lbl);

  const bars = document.createElement('div');
  bars.className = 'tl-bars';

  segments.forEach(s => bars.appendChild(makeSeg(s.l, s.w, s.c)));
  addDayDividers(bars, numDays, totalMinutes);

  row.appendChild(bars);
  return row;
}

function renderTimeline(s1, e1, s2, e2, oStart, oEnd, hasOverlap) {
  const el = document.getElementById('timeline');
  el.innerHTML = '';

  // Determine which UTC days are needed
  const spanMin     = Math.min(s1, s2);
  const spanMax     = Math.max(e1, e2);
  const dayStartIdx = Math.floor(spanMin / 1440);
  const dayEndIdx   = Math.floor((spanMax - 0.001) / 1440);
  const numDays     = dayEndIdx - dayStartIdx + 1;
  const tlMin       = dayStartIdx * 1440;
  const tlMax       = tlMin + numDays * 1440;
  const totalMinutes = numDays * 1440;

  const today   = new Date();
  const wrapper = document.createElement('div');
  wrapper.className = 'tl-wrapper';

  // ── Header row: day labels ──────────────────────────────────────
  const headerRow = document.createElement('div');
  headerRow.className = 'tl-row tl-header-row';

  const headerLabel = document.createElement('div');
  headerLabel.className = 'tl-label';
  headerRow.appendChild(headerLabel);

  const headerBars = document.createElement('div');
  headerBars.className = 'tl-bars';

  for (let i = 0; i < numDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayStartIdx + i);

    const dayLbl = document.createElement('div');
    dayLbl.className   = 'day-label';
    dayLbl.textContent = DAY_NAMES[date.getDay()];
    dayLbl.style.left  = pct(i * 1440, totalMinutes);
    dayLbl.style.width = pct(1440, totalMinutes);
    headerBars.appendChild(dayLbl);
  }

  headerRow.appendChild(headerBars);
  wrapper.appendChild(headerRow);

  // ── TZ1 bar ─────────────────────────────────────────────────────
  wrapper.appendChild(makeBarRow(
    'TZ1', 'tl-tz1',
    tzSegments(tlMin, tlMax, s1, e1, COLORS.tz1Muted, COLORS.tz1Strong),
    numDays, totalMinutes
  ));

  // ── TZ2 bar ─────────────────────────────────────────────────────
  wrapper.appendChild(makeBarRow(
    'TZ2', 'tl-tz2',
    tzSegments(tlMin, tlMax, s2, e2, COLORS.tz2Muted, COLORS.tz2Strong),
    numDays, totalMinutes
  ));

  // ── Overlap bar ─────────────────────────────────────────────────
  const oSegs = overlapSegments(tlMin, tlMax, oStart, oEnd, hasOverlap);
  if (!hasOverlap) {
    oSegs.push({ l: '0%', w: '100%', c: COLORS.noOverlapTint });
  }
  wrapper.appendChild(makeBarRow(
    'Overlap', 'tl-ovr', oSegs, numDays, totalMinutes
  ));

  // ── Legend ───────────────────────────────────────────────────────
  const legend = document.createElement('div');
  legend.className = 'tl-legend';
  [
    { c: COLORS.tz1Strong, label: 'TZ1 business hours' },
    { c: COLORS.tz1Muted,  label: 'TZ1 other hours'   },
    { c: COLORS.tz2Strong, label: 'TZ2 business hours' },
    { c: COLORS.tz2Muted,  label: 'TZ2 other hours'   },
    { c: COLORS.overlap,   label: 'Overlap'            },
  ].forEach(({ c, label }) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const sw = document.createElement('div');
    sw.className        = 'legend-swatch';
    sw.style.background = c;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(label));
    legend.appendChild(item);
  });
  wrapper.appendChild(legend);

  el.appendChild(wrapper);
}

function calculate() {
  const tz1    = document.getElementById('tz1').value;
  const tz2    = document.getElementById('tz2').value;
  const start1 = document.getElementById('start1').value;
  const end1   = document.getElementById('end1').value;
  const start2 = document.getElementById('start2').value;
  const end2   = document.getElementById('end2').value;

  if (!start1 || !end1 || !start2 || !end2) {
    alert('Please fill in all start and end times.');
    return;
  }

  let s1 = localToUTC(start1, tz1);
  let e1 = localToUTC(end1,   tz1);
  let s2 = localToUTC(start2, tz2);
  let e2 = localToUTC(end2,   tz2);

  // Handle overnight local schedules (e.g. 22:00–06:00)
  if (e1 <= s1) e1 += 1440;
  if (e2 <= s2) e2 += 1440;

  const oStart     = Math.max(s1, s2);
  const oEnd       = Math.min(e1, e2);
  const hasOverlap = oEnd > oStart;
  const oMinutes   = hasOverlap ? oEnd - oStart : 0;

  // Summary text
  const summary = document.getElementById('overlap-summary');
  if (hasOverlap) {
    const h = Math.floor(oMinutes / 60);
    const m = oMinutes % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    summary.textContent = `${parts.join(' ')} overlap`;
    summary.className   = 'overlap-summary has-overlap';
  } else {
    summary.textContent = 'No overlap';
    summary.className   = 'overlap-summary no-overlap';
  }

  renderTimeline(s1, e1, s2, e2, oStart, oEnd, hasOverlap);
  document.getElementById('results').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  populateDropdowns();
  document.getElementById('calculate').addEventListener('click', calculate);
});
