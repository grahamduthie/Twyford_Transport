# Twyford Transport Live Bus Tracker

## Project overview

A real-time bus tracking web application for Twyford, Berkshire (UK). It displays live bus positions on an interactive map using data from the UK government's **Bus Open Data Service (BODS)** SIRI-VM API. The frontend was designed in Google Stitch and uses a custom design system called "Kinetic Flow".

The app is a single-page Node.js/Express application with no build step. The backend proxies and processes BODS XML data; the frontend is vanilla JavaScript with Leaflet.js for mapping.

## Architecture

```
Browser (public/index.html + public/app.js)
    │
    │  fetch /api/buses, /api/stops, /api/stops/:id/arrivals, /api/routes
    ▼
Express server (server.js, port 3000)
    │
    │  3 parallel HTTP requests (one per operator)
    ▼
BODS SIRI-VM API (data.bus-data.dft.gov.uk)
    │
    │  Returns XML per operator's entire fleet
    ▼
Server parses XML, filters to bounding box, returns JSON
```

## File structure

```
├── server.js                    # Express backend — sole server file
├── public/
│   ├── index.html               # Single-page HTML shell (Tailwind CSS, Leaflet, layout)
│   └── app.js                   # All frontend JavaScript (map, panels, refresh, nav)
├── package.json                 # Dependencies: express, dotenv, xml2js
├── .env                         # BODS_API_KEY (gitignored)
├── .gitignore
└── stitch_twyford_live_bus_tracker/   # Google Stitch design exports (reference only)
    ├── kinetic_flow/DESIGN.md         # Design system documentation
    ├── live_tracking_map_twyford_branding/    # code.html + screen.png
    ├── live_stop_arrivals_twyford_branding/   # code.html + screen.png
    ├── bus_journey_tracking_twyford_branding/ # code.html + screen.png
    └── map_filters_twyford_branding/         # code.html + screen.png
```

## Running the app

```bash
npm install
# Ensure .env contains: BODS_API_KEY=<your key>
npm start        # production: node server.js
npm run dev      # development: node --watch server.js
```

The server listens on `http://localhost:3000` (or `PORT` env var).

## Backend (server.js)

### Data source: BODS SIRI-VM

The UK Bus Open Data Service provides real-time vehicle locations via SIRI-VM (Vehicle Monitoring) XML feeds. The API endpoint is:

```
https://data.bus-data.dft.gov.uk/api/v1/datafeed/?api_key=KEY&operatorRef=OPCODE
```

**Critical discovery:** The BODS `boundingBox` query parameter filters *data feeds* (entire operator datasets), NOT individual vehicle positions. It returns empty results for localized areas. The working approach is to query by `operatorRef` for each operator, then filter vehicles by lat/lon on the server.

### Operators queried

The server queries three operators in parallel (`BODS_OPERATORS` array on line 127):

| Code | Operator | Key Twyford routes |
|------|----------|-------------------|
| `RBUS` | Reading Buses | 12 |
| `CSLB` | Carousel Buses | 127, 850 |
| `CTNY` | Courtney Buses | 128, 129, 227 |

If a new operator starts serving the area, add their BODS code to `BODS_OPERATORS` and add a display name mapping to `OPERATOR_NAMES`.

### Bounding box

Vehicles are filtered server-side to `TWYFORD_BBOX` (line 131):
- Latitude: 51.42 to 51.53
- Longitude: -0.94 to -0.76

This covers Twyford plus surrounding approach roads from Reading, Wokingham, and Maidenhead. Adjust these values to widen or narrow the area.

### Server-side caching

`getCachedBodsData()` caches BODS responses for 10 seconds (`CACHE_TTL`). This prevents redundant API calls when multiple frontend requests arrive close together (e.g., `/api/buses` and `/api/stops/:id/arrivals` both call `getCachedBodsData()`).

### Destination name cleanup

BODS destination names are often messy (e.g., `High_Wycombe__High_Wycombe_BusStn`). The `cleanDestination()` function (line 89):
1. Replaces underscores with spaces
2. Strips comma-prefixed location duplicates
3. Removes repeated city name prefixes (e.g., "High Wycombe High Wycombe X" → "High Wycombe X")
4. Expands abbreviations: `BusStn` → `Bus Station`, `Stn` → `Station`, `Rd` → `Road`
5. Does NOT expand `St` → `Street` (ambiguous with "Saint")

When BODS returns no destination name, the server falls back to `ROUTES_INFO` metadata.

### API endpoints

#### `GET /api/buses`
Returns all live buses in the bounding box.
```json
{
  "source": "live" | "error",
  "count": 19,
  "data": [{
    "id": "BU52GAS",           // VehicleRef from BODS
    "lineRef": "128",
    "operator": "Courtney Buses",
    "operatorRef": "CTNY",
    "destinationName": "Wokingham Station",
    "originName": "Friar Street",
    "directionRef": "outbound",
    "lat": 51.4739,
    "lon": -0.8579,
    "bearing": 121,            // nullable — degrees from north
    "delay": "On Time",        // or "6m Delay", "2m Early"
    "delayMins": 0,            // negative = early, positive = late
    "status": "on-time",       // "on-time" | "late" | "early"
    "color": "#2563eb",        // route colour (from ROUTES_INFO or generated)
    "recordedAt": "2026-05-22T08:07:44+00:00",
    "monitoredCall": null,     // nullable — current/next stop if operator provides it
    "onwardCalls": []          // future stops if operator provides them
  }],
  "timestamp": "2026-05-22T08:07:45.123Z"
}
```

#### `GET /api/stops`
Returns the 5 hardcoded Twyford bus stops with their lat/lon and which route numbers serve them. These are static data, not from BODS.

#### `GET /api/stops/:id/arrivals`
Estimates arrival times for a specific stop by:
1. Finding all live buses whose `lineRef` matches the stop's `routes` array
2. Calculating straight-line distance between bus and stop
3. Converting to an ETA in minutes (using ~0.0001 degrees/second ≈ 30mph)
4. Only including buses within 60 minutes

This is a rough estimate. BODS data does not reliably include stop-level arrival predictions for these operators.

#### `GET /api/routes`
Returns `ROUTES_INFO` enriched with `stopsServed` (which Twyford stops each route uses) and `color`.

### Known Twyford stops

Defined in `TWYFORD_STOPS` (line 14). Each has a NaPTAN ID, display name, lat/lon, and an array of route numbers that serve it. These are hardcoded — not fetched from BODS. If bus routes change, this array must be updated manually.

| ID | Name | Key routes |
|----|------|------------|
| 035091120001 | Twyford Station (Stop A) | 128, 129, 850 |
| 035091120002 | Twyford Station (Stop B) | 128, 129, 127 |
| 035091100005 | Wargrave Road | 127, 850 |
| 035091100003 | Twyford Crossroads | 128, 129, 12, 227 |
| 035091100008 | Waltham Road | 128, 129, 12 |

### Route metadata

Defined in `ROUTES_INFO` (line 63). Maps route number to operator, origin, destination, and a display colour. Used as a fallback when BODS data is incomplete, and for the Routes view.

## Frontend (public/index.html + public/app.js)

### Design system

The UI uses the "Kinetic Flow" design system exported from Google Stitch. Key details:
- **Fonts:** Sora (headlines), Hanken Grotesk (body), JetBrains Mono (labels/mono)
- **Primary colour:** `#004ac6` (deep blue)
- **Primary container:** `#2563eb` (brighter blue, used for active nav states)
- **Tailwind:** Loaded via CDN with custom theme config inline in `index.html` (lines 20-109)
- **Glassmorphism:** `.glass-panel` class — semi-transparent white with blur backdrop
- **Animations:** `.pulse-on-time` (green pulse), `.pulse-late` (amber pulse) for bus status

Full design system reference: `stitch_twyford_live_bus_tracker/kinetic_flow/DESIGN.md`

### Layout structure

- **Top nav bar** (70px, fixed, z-1000): Brand title, search input (desktop), live status badge, notification/profile icon buttons
- **Sidebar** (272px, fixed left, desktop only, z-900): Hub title, Map/Routes nav buttons, operator filter checkboxes at bottom
- **Main content** (fills remaining space, z-0): Leaflet map or Routes view
- **Stop arrivals panel** (right side, slides in, z-990): Shows when a stop marker is clicked
- **Journey tracking panel** (left side, slides in, z-990): Shows when a bus marker is clicked or "Track Route" is pressed
- **Mobile bottom nav** (fixed bottom, z-1000): Map, Routes, Filters buttons
- **Mobile filter drawer** (75% height bottom sheet, z-1010): Operator + route filters
- **Panel backdrop** (z-980, mobile only): Semi-transparent overlay behind panels

### app.js structure

The frontend is a single file (~840 lines) organized into clearly labeled sections:

1. **CONFIG** (line 6): Map center coordinates, zoom level, refresh interval
2. **state** (line 13): Central mutable state object — map instance, data arrays, marker dictionaries, active panel IDs, filter sets, current view
3. **DOM references** (line 31): All `$`-prefixed variables, cached `getElementById` calls
4. **Map initialisation** (line 59): Creates Leaflet map with OpenStreetMap tiles, zoom control top-right
5. **Custom markers** (line 79): `createBusIcon()` — circle with bus icon + coloured route label pill; `createStopIcon()` — small blue dot + name label
6. **Data fetching** (line 112): Four async functions wrapping `fetch()` calls to each API endpoint
7. **Map updates** (line 161): `updateBusMarkers()` — add/update/remove bus markers based on current state and operator filters; `updateStopMarkers()` — recreate all stop markers
8. **Status badge** (line 223): Updates the top-right badge to show "Live · N buses", "No Active Buses" (amber), or "Feed Error" (red)
9. **Stop arrivals panel** (line 246): `openStopPanel()` → fetch arrivals → `renderArrivals()` with arrival cards; each card has a "Track Route" button
10. **Journey tracking panel** (line 329): `openJourneyPanel()` → `renderJourneyTimeline()` builds a vertical timeline from `monitoredCall`/`onwardCalls` (if available from BODS), else falls back to known Twyford stops for that route with distance-based estimates
11. **Filters** (line 490): Discovers operators from live data, renders checkbox lists in sidebar and mobile drawer, syncs state between desktop and mobile
12. **Search** (line 587): Filters map markers by opacity based on name/route/operator matching
13. **Routes view** (line 627): Renders route cards with live bus counts and "View on Map" buttons
14. **Navigation** (line 696): `switchView('map' | 'routes')` toggles between views, updates nav button active states
15. **Auto-refresh** (line 736): `refreshData()` called every 30 seconds via `setInterval`; refreshes buses, markers, status badge, and any open panel
16. **Event bindings** (line 777): Wires up all click handlers, search input, share button
17. **Initialisation** (line 820): `init()` called on DOMContentLoaded — creates map, binds events, fetches all data in parallel, starts refresh

### Panel animations

Panels use CSS transform/opacity transitions (`.panel-transition` class, 0.4s cubic-bezier). They start off-screen (`translate-x-[110%]` or `translate-x-[-110%]`) with `opacity-0` and `pointer-events-none`. Opening removes these classes and adds `translate-x-0 opacity-100`.

### Operator filter flow

1. `discoverOperators()` scans current `state.buses` and `state.routes` to build `state.allOperators`
2. First run: all operators are enabled (added to `state.operatorFilters`)
3. `renderOperatorFilters()` generates checkboxes in both desktop sidebar and mobile drawer
4. `handleOperatorFilterChange()` updates `state.operatorFilters` and syncs checkbox state across desktop/mobile
5. `updateBusMarkers()` filters `state.buses` by `state.operatorFilters` before rendering

### Mobile responsiveness

- Sidebar hidden below `md` breakpoint (768px)
- Panels go full-width on mobile (`w-full` without `md:max-w-[420px]`)
- Bottom nav replaces sidebar navigation
- Filter drawer slides up as a bottom sheet
- Panel backdrop only shows on mobile

## Data quality notes

- **Reading Buses (RBUS):** Does not provide `DestinationName` in their BODS feed — always "Unknown Destination". The server falls back to `ROUTES_INFO` for known routes, but Reading Buses routes not in `ROUTES_INFO` (e.g., 17, 21, 14) will still show "Unknown Destination". They do provide `OriginName` and `Bearing`.
- **Carousel Buses (CSLB):** Provides destination names but they need cleanup (underscores, duplicated city prefixes). Does not provide `Bearing`.
- **Courtney Buses (CTNY):** Provides `Bearing` but not `DestinationName`. Falls back to `ROUTES_INFO`.
- **MonitoredCall / OnwardCalls:** None of the three operators currently provide these SIRI-VM fields. The journey timeline therefore always uses the local Twyford stops fallback with distance-based estimates. If operators start publishing this data, the code is ready to use it.
- **Arrival ETAs:** Calculated from straight-line distance at an assumed speed. These are rough estimates, not real timetable data. A bus heading away from a stop will still show an ETA.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BODS_API_KEY` | Yes | API key for data.bus-data.dft.gov.uk. Get one at https://data.bus-data.dft.gov.uk/ |
| `PORT` | No | Server port (default: 3000) |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.19.2 | HTTP server and static file serving |
| dotenv | ^16.4.5 | Load `.env` file |
| xml2js | ^0.6.2 | Parse SIRI-VM XML responses from BODS |

Frontend dependencies are loaded via CDN (no npm/bundling):
- Tailwind CSS (with forms + container-queries plugins)
- Leaflet.js 1.9.4
- Google Material Symbols (icons)
- Google Fonts (Sora, Hanken Grotesk, JetBrains Mono)

## Not yet implemented

The following features are visible in the Stitch designs or HTML but are not functional:

- **Saved stops** ("Save Stop" button in arrivals panel) — no persistence layer
- **Alerts** (notification bell in top nav) — no alert/disruption data source
- **Share** buttons — `navigator.share()` is wired up for the journey panel but only works on mobile/supporting browsers; the stop share button is not wired
- **User profile** (person icon in top nav) — no auth system
- **Bus bearing on map** — bearing data is fetched and returned but not used to rotate bus markers
- **Route path lines on map** — the Stitch designs show a dashed route line on the journey view; not implemented as BODS doesn't provide route geometry

## Common modifications

**Add a new bus stop:** Add an entry to `TWYFORD_STOPS` in `server.js` with the NaPTAN ID, name, lat/lon, and which routes serve it.

**Add a new route:** Add an entry to `ROUTES_INFO` in `server.js` with operator, origin, destination, and colour. Update any relevant stops' `routes` arrays.

**Add a new operator:** Add their BODS operator code to `BODS_OPERATORS`, add a display name mapping to `OPERATOR_NAMES`.

**Widen the geographic area:** Adjust `TWYFORD_BBOX` values. Consider whether additional operators need to be queried.

**Change refresh interval:** Modify `CONFIG.REFRESH_MS` in `public/app.js` (frontend polling) and optionally `CACHE_TTL` in `server.js` (server-side cache).

**Switch map tiles:** Change the tile URL template in `initMap()` in `public/app.js` (line 67).
