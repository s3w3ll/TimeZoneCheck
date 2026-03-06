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
