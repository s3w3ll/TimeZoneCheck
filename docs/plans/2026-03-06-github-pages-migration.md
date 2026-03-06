# GitHub Pages Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Flask/Python app with a pure static site (HTML/CSS/JS) deployable on GitHub Pages, with a polished UI, timezone dropdowns, and a multi-day UTC timeline visual.

**Architecture:** Single-page app with no build step. All timezone math runs in the browser via `Intl` APIs. Three files: `index.html`, `style.css`, `app.js` served from the repo root.

**Tech Stack:** Vanilla JS (ES2020), CSS custom properties, `Intl.DateTimeFormat`, `Intl.supportedValuesOf`

---

## Task 1: Remove Flask files

**Files:**
- Delete: `main.py`
- Delete: `templates/index.html`
- Delete: `templates/2kohuhu.txt`
- Delete: `templates/Untitled-1.txt`

**Step 1: Remove the files**

```bash
git rm main.py templates/index.html templates/2kohuhu.txt "templates/Untitled-1.txt"
rmdir templates
```

**Step 2: Verify clean state**

```bash
git status
```
Expected: only `docs/` and the new files remain.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Flask app files"
```

---

## Task 2: Create index.html

**Files:**
- Create: `index.html`

**Step 1: Write the file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time Zone Overlap Checker</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Time Zone Overlap Checker</h1>

    <div class="panels">
      <div class="panel panel-tz1">
        <h2>Timezone 1</h2>
        <div class="field">
          <label for="tz1">Timezone</label>
          <select id="tz1"></select>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="start1">Start</label>
            <input type="time" id="start1">
          </div>
          <div class="field">
            <label for="end1">End</label>
            <input type="time" id="end1">
          </div>
        </div>
      </div>

      <div class="panel panel-tz2">
        <h2>Timezone 2</h2>
        <div class="field">
          <label for="tz2">Timezone</label>
          <select id="tz2"></select>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="start2">Start</label>
            <input type="time" id="start2">
          </div>
          <div class="field">
            <label for="end2">End</label>
            <input type="time" id="end2">
          </div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button id="calculate">Calculate Overlap</button>
    </div>

    <div id="results" class="results hidden">
      <div id="overlap-summary" class="overlap-summary"></div>
      <div id="timeline"></div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add index.html scaffold"
```

---

## Task 3: Create style.css

**Files:**
- Create: `style.css`

**Step 1: Write the file**

```css
:root {
  --tz1-bg:     #fff0f0;
  --tz1-muted:  #f4a0a0;
  --tz1-strong: #e03030;
  --tz2-bg:     #f0f4ff;
  --tz2-muted:  #90b4f0;
  --tz2-strong: #2060e0;
  --overlap:    #9040c0;
  --no-overlap: #e03030;
  --radius:     10px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f2f2f7;
  color: #1c1c1e;
  min-height: 100vh;
  padding: 2.5rem 1rem;
}

.container {
  max-width: 860px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 2rem;
}

/* ── Panels ─────────────────────────────────────────────────────── */

.panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

@media (max-width: 580px) {
  .panels { grid-template-columns: 1fr; }
}

.panel {
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}

.panel-tz1 { background: var(--tz1-bg); border: 1.5px solid var(--tz1-muted); }
.panel-tz2 { background: var(--tz2-bg); border: 1.5px solid var(--tz2-muted); }

.panel h2 {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 1rem;
  color: #444;
}

.field { margin-bottom: 0.75rem; }

.field label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #666;
  margin-bottom: 0.3rem;
}

.field select,
.field input[type="time"] {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border-radius: 7px;
  border: 1.5px solid #d0d0d8;
  font-size: 0.9rem;
  background: #fff;
  color: #1c1c1e;
  outline: none;
  transition: border-color 0.15s;
  appearance: auto;
}

.field select:focus,
.field input[type="time"]:focus {
  border-color: #888;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

/* ── Button ─────────────────────────────────────────────────────── */

.actions { text-align: center; margin-bottom: 1.5rem; }

#calculate {
  background: #1c1c1e;
  color: #fff;
  border: none;
  padding: 0.7rem 2.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

#calculate:hover  { background: #3a3a3c; }
#calculate:active { transform: scale(0.98); }

/* ── Results ────────────────────────────────────────────────────── */

.results {
  background: #fff;
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}

.results.hidden { display: none; }

.overlap-summary {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  letter-spacing: -0.01em;
}

.overlap-summary.has-overlap { color: var(--overlap); }
.overlap-summary.no-overlap  { color: var(--no-overlap); }

/* ── Timeline ───────────────────────────────────────────────────── */

#timeline { overflow-x: auto; }

.tl-wrapper { min-width: 400px; }

.tl-row {
  display: flex;
  align-items: stretch;
  margin-bottom: 6px;
}

.tl-label {
  width: 58px;
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: right;
  padding-right: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: #888;
}

.tl-label.tl-tz1 { color: var(--tz1-strong); }
.tl-label.tl-tz2 { color: var(--tz2-strong); }
.tl-label.tl-ovr { color: var(--overlap); }

.tl-bars {
  flex: 1;
  height: 22px;
  position: relative;
  border-radius: 5px;
  overflow: hidden;
  background: #ebebf0;
}

/* header row: taller, transparent, for day labels */
.tl-header-row .tl-bars {
  height: 28px;
  background: transparent;
  overflow: visible;
  border-radius: 0;
}

.bar-seg {
  position: absolute;
  top: 0;
  height: 100%;
}

.day-label {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #666;
}

.day-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(120,120,128,0.25);
  z-index: 3;
  pointer-events: none;
}

/* legend */
.tl-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  color: #666;
}

.legend-swatch {
  width: 18px;
  height: 11px;
  border-radius: 3px;
  flex-shrink: 0;
}
```

**Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add stylesheet"
```

---

## Task 4: Create app.js

**Files:**
- Create: `app.js`

Write the file in four logical sections as described below.

---

### 4a — Constants and timezone utilities

**Step 1: Write the top of app.js with constants and UTC conversion helpers**

Key insight: `getUTCOffsetMinutes` extracts the UTC offset from the `shortOffset` timezone name
(e.g. `"GMT-5"` → `-300`, `"GMT+5:30"` → `+330`). This is the correct offset for today's date,
so DST is automatically handled.

`localToUTC(timeStr, tz)` returns UTC minutes from midnight (can be negative or > 1440 when
a timezone is many hours ahead/behind UTC).

```js
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
  noOverlap: '#e03030',
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
```

---

### 4b — Dropdown population

**Step 2: Add the populateDropdowns function**

`Intl.supportedValuesOf('timeZone')` returns all IANA timezone names sorted alphabetically.
Both dropdowns default to the user's detected local timezone.

```js
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
```

---

### 4c — Timeline rendering

**Step 3: Add the timeline rendering helpers and renderTimeline function**

The timeline maps UTC minutes to horizontal percentage positions.
`tlMin` is the start of the first day column (always a multiple of 1440).
`tlMax = tlMin + numDays * 1440`.

For each bar row (TZ1, TZ2, Overlap):
- The full bar background is the muted colour (or neutral grey for overlap).
- Segments are absolutely-positioned `<div>` elements sized by `%` of total span.

```js
function pct(minutes, total) {
  return (minutes / total * 100).toFixed(5) + '%';
}

// Build an array of {leftPct, widthPct, color} segments for a TZ working-hours bar.
function tzSegments(tlMin, tlMax, activeStart, activeEnd, muted, strong) {
  const total  = tlMax - tlMin;
  const aStart = Math.max(activeStart, tlMin);
  const aEnd   = Math.min(activeEnd,   tlMax);
  const segs   = [];

  // Before business hours
  if (aStart > tlMin)
    segs.push({ l: pct(0, total),               w: pct(aStart - tlMin,    total), c: muted  });
  // Business hours
  if (aEnd > aStart)
    segs.push({ l: pct(aStart - tlMin, total),  w: pct(aEnd   - aStart,   total), c: strong });
  // After business hours
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
  d.className       = 'bar-seg';
  d.style.left      = l;
  d.style.width     = w;
  d.style.background = c;
  return d;
}

function makeDividers(barsEl, dayStartIdx, numDays, tlMin, totalMinutes) {
  for (let i = 1; i < numDays; i++) {
    const d = document.createElement('div');
    d.className  = 'day-divider';
    d.style.left = pct(i * 1440, totalMinutes);
    barsEl.appendChild(d);
  }
}

function makeBarRow(labelText, labelClass, segments, dayStartIdx, numDays, totalMinutes) {
  const row  = document.createElement('div');
  row.className = 'tl-row';

  const lbl  = document.createElement('div');
  lbl.className = `tl-label ${labelClass}`;
  lbl.textContent = labelText;
  row.appendChild(lbl);

  const bars = document.createElement('div');
  bars.className = 'tl-bars';

  segments.forEach(s => bars.appendChild(makeSeg(s.l, s.w, s.c)));
  makeDividers(bars, dayStartIdx, numDays, 0, totalMinutes);

  row.appendChild(bars);
  return row;
}

function renderTimeline(s1, e1, s2, e2, oStart, oEnd, hasOverlap) {
  const el = document.getElementById('timeline');
  el.innerHTML = '';

  // Determine which UTC days are needed
  const spanMin    = Math.min(s1, s2);
  const spanMax    = Math.max(e1, e2);
  const dayStartIdx = Math.floor(spanMin / 1440);
  const dayEndIdx   = Math.floor((spanMax - 0.001) / 1440);
  const numDays     = dayEndIdx - dayStartIdx + 1;
  const tlMin       = dayStartIdx * 1440;
  const tlMax       = tlMin + numDays * 1440;
  const totalMinutes = numDays * 1440;

  const today = new Date();
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
    dayLbl.className    = 'day-label';
    dayLbl.textContent  = DAY_NAMES[date.getDay()];
    dayLbl.style.left   = pct(i * 1440, totalMinutes);
    dayLbl.style.width  = pct(1440, totalMinutes);
    headerBars.appendChild(dayLbl);
  }

  headerRow.appendChild(headerBars);
  wrapper.appendChild(headerRow);

  // ── TZ1 bar ─────────────────────────────────────────────────────
  wrapper.appendChild(makeBarRow(
    'TZ1', 'tl-tz1',
    tzSegments(tlMin, tlMax, s1, e1, COLORS.tz1Muted, COLORS.tz1Strong),
    dayStartIdx, numDays, totalMinutes
  ));

  // ── TZ2 bar ─────────────────────────────────────────────────────
  wrapper.appendChild(makeBarRow(
    'TZ2', 'tl-tz2',
    tzSegments(tlMin, tlMax, s2, e2, COLORS.tz2Muted, COLORS.tz2Strong),
    dayStartIdx, numDays, totalMinutes
  ));

  // ── Overlap bar ─────────────────────────────────────────────────
  const oSegs = overlapSegments(tlMin, tlMax, oStart, oEnd, hasOverlap);
  // When no overlap, fill the bar red as a visual indicator
  if (!hasOverlap) {
    oSegs.push({ l: '0%', w: '100%', c: 'rgba(224,48,48,0.15)' });
  }
  wrapper.appendChild(makeBarRow(
    'Overlap', 'tl-ovr', oSegs, dayStartIdx, numDays, totalMinutes
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
    sw.className  = 'legend-swatch';
    sw.style.background = c;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(label));
    legend.appendChild(item);
  });
  wrapper.appendChild(legend);

  el.appendChild(wrapper);
}
```

---

### 4d — Calculate handler and init

**Step 4: Add the calculate function and DOMContentLoaded init**

```js
function calculate() {
  const tz1    = document.getElementById('tz1').value;
  const tz2    = document.getElementById('tz2').value;
  const start1 = document.getElementById('start1').value;
  const end1   = document.getElementById('end1').value;
  const start2 = document.getElementById('start2').value;
  const end2   = document.getElementById('end2').value;

  let s1 = localToUTC(start1, tz1);
  let e1 = localToUTC(end1,   tz1);
  let s2 = localToUTC(start2, tz2);
  let e2 = localToUTC(end2,   tz2);

  // Handle overnight local schedules (e.g. 22:00–06:00)
  if (e1 <= s1) e1 += 1440;
  if (e2 <= s2) e2 += 1440;

  const oStart      = Math.max(s1, s2);
  const oEnd        = Math.min(e1, e2);
  const hasOverlap  = oEnd > oStart;
  const oMinutes    = hasOverlap ? oEnd - oStart : 0;

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
```

**Step 5: Commit**

```bash
git add app.js
git commit -m "feat: add app.js with timezone calculation and timeline renderer"
```

---

## Task 5: Verify in browser

**Step 1: Open index.html in a browser**

```bash
# On Windows — open from repo root
start index.html
```

**Step 2: Check the following scenarios**

| Test | Setup | Expected |
|---|---|---|
| Same timezone | Both TZ = local, default hours | Purple overlap: 9h |
| New York + London | NY 08:00–17:00, London 08:00–17:00 | ~2h overlap (13:00–15:00 UTC) |
| Sydney + New York | Default hours | 0 overlap — red result + subtle red bar |
| Multi-day | Sydney + Hawaii | Two day columns visible with day labels |
| Overnight hours | Set end < start (e.g. 22:00–06:00) | No crash, window spans midnight correctly |

**Step 3: Check responsive layout**

Resize browser to below 580px wide. Panels should stack vertically.

**Step 4: Fix any visual issues before committing**

---

## Task 6: Update README

**Files:**
- Modify: `README.md`

**Step 1: Replace README content**

```markdown
# Time Zone Overlap Checker

A static web app to find the business-hours overlap between two timezones.

## Features

- Searchable dropdown of all IANA timezones (populated from `Intl.supportedValuesOf`)
- Configurable business hours per timezone (default 08:00–17:00)
- Colour-coded timeline showing both windows across UTC day columns
- Handles overnight schedules and multi-day UTC spans

## Deployment (GitHub Pages)

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set Source to: **Deploy from a branch → main → / (root)**
4. Click **Save** — the site will be live at `https://<username>.github.io/<repo>/`

## Local development

No build step. Just open `index.html` in a browser.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with deployment instructions"
```

---

## Task 7: Final commit check

**Step 1: Verify file structure**

```bash
ls -1
```
Expected:
```
app.js
docs/
index.html
README.md
style.css
```

**Step 2: Confirm git log**

```bash
git log --oneline -6
```

**Step 3: Push to GitHub**

```bash
git push origin main
```

Then enable GitHub Pages in the repo Settings as described in the README.
