# Jurisdictional Safety Gap

An interactive data visualisation exploring why a national road safety strategy fails if it is not state specific.

**Live idea in one line:** National averages hide very different trauma profiles across Australian states and territories, As a result treating them as one story leads to blind spots in policy and funding.

---

## What This Is

A scrollable, D3-powered data story built around Australian road crash hospitalisation data (2011–2021). It walks through three linked chapters, each backed by an interactive chart, with global filters (state selection + year range) that update the whole story at once.

**Audience:** Federal and state infrastructure planners
**Dataset:** BITRE hospitalised road crash injury data, 2011–2021
**Core claim:** National averages hide distinct state-level trauma profiles

---

## The Story

### Chapter 1 — Trend
*Not every state is getting safer.*
A line chart tracking hospitalised injuries by state over time. NSW and Victoria lead in volume but show real declines. NT and WA show a decade of little to no improvement, a pattern a national average completely erases.

### Chapter 2 — Comparison
*Who gets hurt depends on where you live.*
A grouped bar chart comparing car occupants against vulnerable road users (motorcyclists, cyclists, pedestrians) by state, with a toggle between grouped and individual road-user views. Remote states like NT show a much higher share of vulnerable road users than urban-dominated national figures suggest.

### Chapter 3 — Severity
*High case counts aren't the whole story.*
A choropleth map showing bed days per case by state. NT has the highest bed-day burden per case of any jurisdiction, despite not having the highest case volume, which matters a lot for how funding gets allocated.

---

## Features

- Global filters: toggle states/territories and drag a dual year-range slider. This updates every chart live.
- Click-to-highlight interactions on the trend lines, bar chart, and map.
- Toggle between grouped and individual road-user breakdowns in Chapter 2.
- Custom tooltips with contextual detail on hover.
- Responsive layout with scroll-reveal animations.
- Info button each graph to improve user experience.

---

## Data Notes & Limitations

- Counts are **not population-adjusted** larger states will naturally show higher raw numbers.
- Victoria (from 2012) and NSW (from 2017) changed their hospital admission counting methodology sudden drops around those years reflect a reporting change, not an actual safety improvement.
- This project visualises a subset of the full available dataset across three chapters.

---

## Data Sources

- [BITRE Data Portal](https://www.bitre.gov.au/publications/ongoing/hospitalised-injury)
- [AIHW injury context](https://www.aihw.gov.au/reports/injury/injury-in-australia/contents/ranked-causes)

---
## Data Pipeline

Raw BITRE hospitalised injury data (Excel) was cleaned and reshaped into the three CSVs used here via a KNIME workflow filtering to relevant fields, standardising state naming, and computing bed-days-per-case for the severity chapter.

---

## Tech Stack

- **D3.js** for all data visualisation and interactivity
- Vanilla JavaScript (no framework) for state management and DOM updates
- HTML/CSS for layout and styling
- GeoJSON for the choropleth map geometry

---

## Project Structure

```
Data-Visualisation-Project/
├── index.html                  # Main page and story structure
├── css/
│   └── style.css
├── js/
│   ├── main.js                 # App state, filters, 
│   ├── sharedConstants.js      # Shared constants (state order, colours, helpers)
│   ├── Viz1_Trend.js           # Chapter 1 — trend line chart
│   ├── Viz2_GroupedBarChart.js # Chapter 2 — grouped bar chart
│   └── Viz3_map.js             # Chapter 3 — choropleth map
├── data/
│   ├── viz1_state_totals.csv
│   ├── viz2_road_user.csv
│   ├── viz3_severity.csv
│   └── australia-states.geojson
├── assets/
    └── filter_hint_logo

```

---

## Running Locally

Since the charts load data via `fetch`/D3's CSV and JSON loaders, you'll need a local server rather than opening `index.html` directly (browsers block local file fetches otherwise).

```bash
# From the project root, using Python
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.