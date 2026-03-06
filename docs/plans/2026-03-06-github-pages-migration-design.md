# Design: GitHub Pages Migration

**Date:** 2026-03-06
**Status:** Approved

## Overview

Migrate the Flask/Python TimeZoneCheck app to a fully static site (HTML/CSS/JS) deployable on GitHub Pages. All server-side logic is ported to the browser using native `Intl` APIs — no build step, no dependencies.

## File Structure

```
TimeZoneCheck/
├── index.html
├── style.css
├── app.js
└── README.md
```

Files removed: `main.py`, `templates/` directory.

## UI Layout

Two timezone panels side by side, a calculate button, then a results panel:

- **TZ1 panel** — soft red background, timezone dropdown, start/end time pickers (default 08:00–17:00)
- **TZ2 panel** — soft blue background, timezone dropdown, start/end time pickers (default 08:00–17:00)
- **Results panel** — overlap duration text + multi-day timeline bar

## Colour Scheme

| Element | Colour |
|---|---|
| TZ1 card background | `#fff0f0` |
| TZ1 non-business bar | `#f4a0a0` (muted red) |
| TZ1 business hours bar | `#e03030` (strong red) |
| TZ2 card background | `#f0f4ff` |
| TZ2 non-business bar | `#90b4f0` (muted blue) |
| TZ2 business hours bar | `#2060e0` (strong blue) |
| Overlap segment | `#9040c0` (purple) |
| No-overlap result | `#e03030` (red text + bar) |

## Timeline Visual

- Spans from the earliest UTC start to the latest UTC end across both timezone windows
- If that span crosses a calendar day boundary, render one column per full day
- Each day column is labelled with the day of the week (Mon, Tue, etc.) above a vertical divider
- Three stacked bar rows: TZ1 window, TZ2 window, overlap
- Business hours rendered at full colour intensity; non-business hours at muted intensity
- Bars flow continuously across day columns when a timezone window crosses midnight UTC

## Data Flow

1. Page load: populate both dropdowns from `Intl.supportedValuesOf('timeZone')`, pre-fill times to 08:00–17:00
2. User clicks Calculate
3. Read timezone names + start/end times from form
4. Use today's date + `Intl.DateTimeFormat` to resolve UTC offsets for each timezone
5. Convert both working windows to UTC milliseconds
6. Compute `latestStart = max(start1utc, start2utc)` and `earliestEnd = min(end1utc, end2utc)`
7. Overlap = `earliestEnd - latestStart` if positive, else 0
8. Render results panel and timeline

## Edge Cases

| Scenario | Behaviour |
|---|---|
| End time < start time | Treated as crossing midnight (e.g. 22:00–06:00 next day) |
| Same timezone for both | Overlap = the smaller of the two windows |
| Zero overlap | Result text "No overlap" in red; no purple segment rendered |

## Deployment

Push to `main` branch root. Enable GitHub Pages in repo Settings → Pages → Source: `main` branch, `/ (root)`.
