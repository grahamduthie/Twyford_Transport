# Twyford Transport Live Bus Tracker

## Project overview

A real-time bus tracking web application for Twyford, Berkshire (UK). It displays live bus positions on an interactive map using data from the UK government's **Bus Open Data Service (BODS)** SIRI-VM API. The frontend was designed in Google Stitch and uses a custom design system called "Kinetic Flow".

The app tracks 5 specific bus routes (128, 129, 127, 850, 12) that pass through Twyford, showing all buses on those routes regardless of their current location — from Reading to High Wycombe, Maidenhead, and Wokingham. 176 timetable bus stops are displayed as interactive map markers across the full extent of all routes.

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
Server parses XML, filters by route number, returns JSON
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

**Critical discovery:** The BODS `boundingBox` query parameter filters *data feeds* (entire operator datasets), NOT individual vehicle positions. It returns empty results for localized areas. The working approach is to query by `operatorRef` for each operator, then filter vehicles by route number on the server.

### Route filtering

The server only returns buses on 5 target routes, defined in `TARGET_ROUTES` (line 194):

```js
const TARGET_ROUTES = new Set(["850", "12", "127", "128", "129"]);
```

All other routes from the queried operators are discarded in `parseVehicleActivities()`. There is no geographic bounding box — buses are tracked along their full routes regardless of distance from Twyford.

### Operators queried

The server queries three operators in parallel (`BODS_OPERATORS`, line 266):

| Code | Operator | Routes |
|------|----------|--------|
| `RBUS` | Reading Buses | 12 |
| `CSLB` | Carousel Buses | 127, 850 |
| `CTNY` | Thames Valley Buses | 128, 129 |

If a new operator starts serving the area, add their BODS code to `BODS_OPERATORS` and add a display name mapping to `OPERATOR_NAMES` (line 212).

### Route metadata

Defined in `ROUTES_INFO` (line 197). Maps route number to operator, origin, destination, and a display colour. Used as a fallback when BODS data is incomplete, and for the Routes view.

| Route | Operator | Origin | Destination | Colour |
|-------|----------|--------|-------------|--------|
| 128 | Thames Valley Buses | Reading Station | Wokingham Station | `#2563eb` |
| 129 | Thames Valley Buses | Reading Station | Wokingham Station | `#3b82f6` |
| 127 | Carousel Buses | Reading Station | Maidenhead | `#10b981` |
| 850 | Carousel Buses | Reading Station | High Wycombe | `#d97706` |
| 12 | Reading Buses | Reading Station | Twyford Hub | `#8b5cf6` |

### Direction bearing derivation

Bus bearing (compass direction of travel) is used to show directional arrows on the map. Different operators provide this data differently:

- **Reading Buses / Thames Valley Buses:** Provide `Bearing` directly in degrees from north.
- **Carousel Buses:** Provide `DirectionRef` (inbound/outbound) but not `Bearing`. The server derives approximate bearings from `ROUTE_DIRECTION_BEARINGS` (line 206):

```js
const ROUTE_DIRECTION_BEARINGS = {
  "127": { outbound: 70, inbound: 250 },   // Reading <-> Maidenhead (ENE/WSW)
  "850": { outbound: 340, inbound: 160 },   // Reading <-> High Wycombe (NNW/SSE)
};
```

In `parseVehicleActivities()` (line 269), when a bus has no raw bearing but has a `directionRef` matching a known route, the derived bearing is used instead.

### Bus stops data

Defined in `ROUTE_STOPS` (line 14). Contains 176 bus stops across all 5 tracked routes, covering the full extent from Reading to High Wycombe, Maidenhead, and Wokingham. Each stop has:

- `id` — NaPTAN ATCO code (UK national bus stop identifier)
- `name` — Display name
- `lat`, `lon` — WGS84 coordinates
- `routes` — Array of route numbers that serve this stop

Many physical locations have two separate NaPTAN stop IDs (one per direction of travel), each serving different routes. For example, "Old Silk Mill" has `035059870001` (route 12) and `035059870002` (routes 127, 128, 850) for opposite sides of the road.

Stop data is hardcoded — not fetched from BODS. Coordinates were sourced from OpenStreetMap (Overpass API) and NaPTAN data via geopunk.co.uk. If bus routes change, this array must be updated manually.

**Key areas covered by stops:**

| Area | Routes | Approximate stop count |
|------|--------|----------------------|
| Reading town centre | All routes | ~15 |
| Woodley / Sonning | 127, 128, 129, 850, 12 | ~25 |
| Charvil / Twyford | All routes | ~20 |
| Wargrave | 127, 850 | ~15 |
| Hurst / Winnersh / Wokingham | 128, 129 | ~25 |
| Knowl Hill / Maidenhead | 127 | ~15 |
| Henley-on-Thames | 850 | ~10 |
| Marlow | 850 | ~15 |
| High Wycombe | 850 | ~15 |

### Server-side caching

`getCachedBodsData()` (line 437) caches BODS responses for 10 seconds (`CACHE_TTL`, line 435). This prevents redundant API calls when multiple frontend requests arrive close together (e.g., `/api/buses` and `/api/stops/:id/arrivals` both call `getCachedBodsData()`).

### Destination name cleanup

BODS destination names are often messy (e.g., `High_Wycombe__High_Wycombe_BusStn`). The `cleanDestination()` function (line 228):
1. Replaces underscores with spaces
2. Strips comma-prefixed location duplicates
3. Removes repeated city name prefixes (e.g., "High Wycombe High Wycombe X" -> "High Wycombe X")
4. Expands abbreviations: `BusStn` -> `Bus Station`, `Stn` -> `Station`, `Rd` -> `Road`
5. Does NOT expand `St` -> `Street` (ambiguous with "Saint")

When BODS returns no destination name, the server falls back to `ROUTES_INFO` metadata.

### API endpoints

#### `GET /api/buses`
Returns all live buses on the 5 target routes.
```json
{
  "source": "live" | "error",
  "count": 19,
  "data": [{
    "id": "BU52GAS",           // VehicleRef from BODS
    "lineRef": "128",
    "operator": "Thames Valley Buses",
    "operatorRef": "CTNY",
    "destinationName": "Wokingham Station",
    "originName": "Friar Street",
    "directionRef": "outbound",
    "lat": 51.4739,
    "lon": -0.8579,
    "bearing": 121,            // nullable — degrees from north (raw or derived)
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
Returns all 176 bus stops with their NaPTAN IDs, names, lat/lon, and which route numbers serve them. These are static data, not from BODS.

```json
[
  {
    "id": "035091120001",
    "name": "Twyford Station",
    "lat": 51.475519,
    "lon": -0.861709,
    "routes": ["128", "129"]
  }
]
```

#### `GET /api/stops/:id/arrivals`
Estimates arrival times for a specific stop by:
1. Finding all live buses whose `lineRef` matches the stop's `routes` array
2. Calculating straight-line distance between bus and stop
3. Converting to an ETA in minutes (using ~0.0001 degrees/second, approximately 30mph)
4. Only including buses within 60 minutes

This is a rough estimate. BODS data does not reliably include stop-level arrival predictions for these operators. A bus heading away from a stop will still show an ETA.

#### `GET /api/routes`
Returns `ROUTES_INFO` enriched with `stopsServed` (all stops each route uses from `ROUTE_STOPS`) and `color`.

### SIRI-VM XML parsing

`parseVehicleActivities()` (line 269) processes raw SIRI-VM XML from BODS:

1. Extracts `VehicleActivity` elements from the XML structure
2. For each activity, reads `MonitoredVehicleJourney` fields (location, line, operator, destination, bearing, delay)
3. Filters out buses not on `TARGET_ROUTES`
4. Parses ISO 8601 duration delays (e.g., `PT5M` -> "5m Delay", `-PT2M` -> "2m Early")
5. Derives bearing from `directionRef` for Carousel routes when raw bearing is unavailable
6. Extracts `MonitoredCall` (current/next stop) and `OnwardCalls` (future stops) if provided
7. De-duplicates by vehicle ID across operator feeds

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
- **Sidebar** (272px, fixed left, desktop only, z-900): Hub title, Map/Routes nav buttons, bus stop toggle, operator filter checkboxes
- **Main content** (fills remaining space, z-0): Leaflet map or Routes view
- **Stop arrivals panel** (right side, slides in, z-990): Shows when a stop marker is clicked
- **Journey tracking panel** (left side, slides in, z-990): Shows when a bus marker is clicked or "Track Route" is pressed
- **Mobile bottom nav** (fixed bottom, z-1000): Map, Routes, Filters buttons
- **Mobile filter drawer** (75% height bottom sheet, z-1010): Display toggle (bus stops), operator filters, route filters
- **Panel backdrop** (z-980, mobile only): Semi-transparent overlay behind panels

### app.js structure

The frontend is a single file (~864 lines) organized into clearly labeled sections:

1. **CONFIG** (line 6): Map center coordinates, zoom level, refresh interval (30s)
2. **state** (line 13): Central mutable state object — map instance, data arrays, marker dictionaries, active panel IDs, filter sets, `stopsVisible` toggle, current view
3. **DOM references** (line 31): All `$`-prefixed variables, cached `getElementById` calls
4. **Map initialisation** (line 60): Creates Leaflet map with OpenStreetMap tiles, zoom control top-right
5. **Custom markers** (line 80): `createBusIcon()` — circle with directional arrow or bus icon + coloured route label pill; `createStopIcon()` — small blue dot (14px)
6. **Data fetching** (line 115): Four async functions wrapping `fetch()` calls to each API endpoint
7. **Map updates** (line 163): `updateBusMarkers()` — add/update/remove bus markers based on current state and operator filters; `updateStopMarkers()` — recreate all stop markers (respects `stopsVisible` toggle)
8. **Status badge** (line 232): Updates the top-right badge to show "Live N buses", "No Active Buses" (amber), or "Feed Error" (red)
9. **Stop arrivals panel** (line 255): `openStopPanel()` -> fetch arrivals -> `renderArrivals()` with arrival cards; each card has a "Track Route" button
10. **Journey tracking panel** (line 338): `openJourneyPanel()` -> `renderJourneyTimeline()` builds a vertical timeline from `monitoredCall`/`onwardCalls` (if available from BODS), else falls back to known route stops with distance-based estimates
11. **Filters** (line 500): `discoverOperators()`, `renderOperatorFilters()`, `handleOperatorFilterChange()` — discovers operators from live data, renders checkbox lists in sidebar and mobile drawer, syncs state between desktop and mobile
12. **Stop toggle** (line 576): `handleStopToggleChange()` — toggles `state.stopsVisible`, syncs checkbox state across desktop/mobile toggle switches (`.stop-toggle-checkbox`), calls `updateStopMarkers()`
13. **Search** (line 590): Filters map markers by opacity based on name/route/operator matching
14. **Routes view** (line 645): Renders route cards with live bus counts and "View on Map" buttons
15. **Navigation** (line 714): `switchView('map' | 'routes')` toggles between views, updates nav button active states
16. **Auto-refresh** (line 754): `refreshData()` called every 30 seconds via `setInterval`; refreshes buses, markers, status badge, and any open panel
17. **Event bindings** (line 795): Wires up all click handlers, search input, share button, stop toggle checkboxes
18. **Initialisation** (line 843): `init()` called on DOMContentLoaded — creates map, binds events, fetches all data in parallel, starts refresh

### Bus markers

`createBusIcon()` (line 80) renders each bus as a Leaflet `DivIcon`:
- **With bearing data:** Shows a `navigation` (arrow) Material Symbol icon, rotated via CSS `transform: rotate(Xdeg)` to point in the direction of travel. The rotation is applied to the inner icon element only — the outer circle and route label pill remain unrotated.
- **Without bearing data:** Shows a static `directions_bus` icon with no rotation.
- The icon circle has a coloured border indicating status: green (on-time), amber (late), cyan (early), with a matching CSS pulse animation.
- Below the circle, a coloured pill shows the route number in JetBrains Mono.

### Stop markers

`createStopIcon()` (line 99) renders each stop as a 14px blue dot (`#004ac6`) with a white border. Stop names are not displayed on the map — instead, a Leaflet tooltip appears on hover, styled with the `.stop-tooltip` CSS class (glassmorphic background matching the Kinetic Flow design). Clicking a stop opens the arrivals panel.

### Stop visibility toggle

Users can show/hide all 176 stop markers via toggle switches in:
- **Desktop sidebar:** Glass panel with "Bus Stops" label and toggle switch
- **Mobile filter drawer:** "Display" section with "Show Bus Stops" toggle

Both toggles use the `.stop-toggle-checkbox` class and are synced — toggling one updates the other. State is stored in `state.stopsVisible` (default: `true`). When hidden, `updateStopMarkers()` clears all stop markers from the map layer.

### Panel animations

Panels use CSS transform/opacity transitions (`.panel-transition` class, 0.4s cubic-bezier). They start off-screen (`translate-x-[110%]` or `translate-x-[-110%]`) with `opacity-0` and `pointer-events-none`. Opening removes these classes and adds `translate-x-0 opacity-100`.

### Operator filter flow

1. `discoverOperators()` (line 500) scans current `state.buses` and `state.routes` to build `state.allOperators`
2. First run: all operators are enabled (added to `state.operatorFilters`)
3. `renderOperatorFilters()` (line 519) generates checkboxes in both desktop sidebar and mobile drawer
4. `handleOperatorFilterChange()` (line 562) updates `state.operatorFilters` and syncs checkbox state across desktop/mobile
5. `updateBusMarkers()` (line 163) filters `state.buses` by `state.operatorFilters` before rendering

### Journey timeline

`renderJourneyTimeline()` (line 380) builds a vertical stop-by-stop timeline in the journey panel. It uses two data sources in priority order:

1. **BODS MonitoredCall/OnwardCalls:** If the operator provides these SIRI-VM fields, the timeline shows actual stop names with aimed and expected arrival times. Currently none of the three operators provide this data.
2. **Route stops fallback:** Uses stops from `state.stops` that serve the bus's route, sorted by distance from the bus. Shows distance-based ETAs calculated from straight-line distance.

### Mobile responsiveness

- Sidebar hidden below `md` breakpoint (768px)
- Panels go full-width on mobile (`w-full` without `md:max-w-[420px]`)
- Bottom nav replaces sidebar navigation
- Filter drawer slides up as a bottom sheet with display toggle + operator/route filters
- Panel backdrop only shows on mobile

## Data quality notes

- **Reading Buses (RBUS):** Does not provide `DestinationName` in their BODS feed — always "Unknown Destination". The server falls back to `ROUTES_INFO` for known routes. They do provide `OriginName` and `Bearing`.
- **Carousel Buses (CSLB):** Provides destination names but they need cleanup (underscores, duplicated city prefixes). Does not provide `Bearing` — the server derives approximate bearings from `DirectionRef` (inbound/outbound) using `ROUTE_DIRECTION_BEARINGS`.
- **Thames Valley Buses (CTNY):** Provides `Bearing` but not `DestinationName`. Falls back to `ROUTES_INFO`.
- **MonitoredCall / OnwardCalls:** None of the three operators currently provide these SIRI-VM fields. The journey timeline therefore always uses the route stops fallback with distance-based estimates. If operators start publishing this data, the code is ready to use it.
- **Arrival ETAs:** Calculated from straight-line distance at an assumed speed. These are rough estimates, not real timetable data. A bus heading away from a stop will still show an ETA.
- **Stop coordinates:** Sourced from OpenStreetMap Overpass API and NaPTAN data via geopunk.co.uk. One stop (Icehouse Lane, Henley, `340024004NOR`) uses approximate coordinates as no exact data was available.

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
- **Route path lines on map** — the Stitch designs show a dashed route line on the journey view; not implemented as BODS doesn't provide route geometry

## Common modifications

**Add a new bus stop:** Add an entry to `ROUTE_STOPS` in `server.js` (line 14) with the NaPTAN ID, name, lat/lon, and which routes serve it. Stop IDs can be looked up at https://www.geopunk.co.uk/bus-stops or via the NaPTAN dataset.

**Add a new route:**
1. Add the route number to `TARGET_ROUTES` in `server.js` (line 194)
2. Add an entry to `ROUTES_INFO` (line 197) with operator, origin, destination, and colour
3. Add all the route's stops to `ROUTE_STOPS` with the new route number in their `routes` arrays
4. If the route has an operator that provides `directionRef` but not `bearing`, add approximate bearings to `ROUTE_DIRECTION_BEARINGS` (line 206)

**Remove a route:** Remove the route number from `TARGET_ROUTES`. Optionally clean up `ROUTES_INFO`, `ROUTE_DIRECTION_BEARINGS`, and stop entries that only served that route.

**Add a new operator:** Add their BODS operator code to `BODS_OPERATORS` (line 266), add a display name mapping to `OPERATOR_NAMES` (line 212).

**Change refresh interval:** Modify `CONFIG.REFRESH_MS` in `public/app.js` (line 8, frontend polling) and optionally `CACHE_TTL` in `server.js` (line 435, server-side cache).

**Switch map tiles:** Change the tile URL template in `initMap()` in `public/app.js` (line 67).

**Change bus stop tooltip style:** Edit the `.stop-tooltip` CSS class in `public/index.html`.

**Change bus marker direction icon:** Modify `createBusIcon()` in `public/app.js` (line 80). The `navigation` icon is used when bearing is available; `directions_bus` is the fallback.
