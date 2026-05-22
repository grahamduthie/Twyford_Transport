// ==============================================
// Twyford Transport Live Tracker — app.js
// ==============================================

// --- Configuration ---
const CONFIG = {
  CENTER: [51.4745, -0.8632],  // Twyford village centre
  ZOOM: 14,
  REFRESH_MS: 30000,           // 30-second refresh
};

// --- Application State ---
const state = {
  map: null,
  buses: [],
  stops: [],
  routes: {},
  busMarkers: {},          // keyed by bus id
  stopMarkers: {},         // keyed by stop id
  activeStopId: null,
  activeJourneyBusId: null,
  refreshTimer: null,
  currentView: 'map',      // 'map' | 'routes'
  operatorFilters: new Set(),  // operators currently enabled (all by default)
  allOperators: new Set(),
  mobileFiltersOpen: false,
  lastFetchSource: null,
};

// ---- DOM references ----
const $map           = document.getElementById('map');
const $emptyState    = document.getElementById('empty-state');
const $emptyMsg      = document.getElementById('empty-state-message');
const $statusDot     = document.getElementById('status-dot');
const $statusText    = document.getElementById('status-text');
const $stopPanel     = document.getElementById('stop-details-panel');
const $stopName      = document.getElementById('panel-stop-name');
const $arrivalsList  = document.getElementById('arrivals-list');
const $journeyPanel  = document.getElementById('journey-details-panel');
const $routeBadge    = document.getElementById('journey-route-badge');
const $routeDest     = document.getElementById('journey-route-dest');
const $routeDesc     = document.getElementById('journey-route-desc');
const $journeyDelay  = document.getElementById('journey-delay-status');
const $journeyOp     = document.getElementById('journey-operator');
const $timelineStops = document.getElementById('timeline-stops-container');
const $timelineLine  = document.getElementById('timeline-progress-line');
const $routesView    = document.getElementById('routes-view');
const $routesList    = document.getElementById('routes-list');
const $operatorFilters      = document.getElementById('operator-filters');
const $mobileOperatorFilters = document.getElementById('mobile-operator-filters');
const $mobileRouteFilters    = document.getElementById('mobile-route-filters');
const $mobileFilterDrawer    = document.getElementById('mobile-filter-drawer');
const $panelBackdrop  = document.getElementById('panel-backdrop');
const $searchInput    = document.getElementById('route-search');

// =============================================
//  MAP INITIALISATION
// =============================================
function initMap() {
  state.map = L.map('map', {
    center: CONFIG.CENTER,
    zoom: CONFIG.ZOOM,
    zoomControl: false,
  });

  // OpenStreetMap standard tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(state.map);

  // Zoom control top-right
  L.control.zoom({ position: 'topright' }).addTo(state.map);
}

// =============================================
//  CUSTOM MARKERS
// =============================================
function createBusIcon(bus) {
  const borderColor = bus.status === 'late' ? '#f59e0b' : (bus.status === 'early' ? '#06b6d4' : '#10b981');
  const pulseClass  = bus.status === 'late' ? 'pulse-late' : 'pulse-on-time';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="bus-marker-container">
        <div class="bus-marker-icon ${pulseClass}" style="border-color: ${borderColor}">
          <span class="material-symbols-outlined" style="font-size:20px; color: ${bus.color}">directions_bus</span>
        </div>
        <div class="bus-marker-label" style="background: ${bus.color}">${bus.lineRef}</div>
      </div>`,
    iconSize: [48, 56],
    iconAnchor: [24, 28],
  });
}

function createStopIcon(stop, isActive) {
  const activeClass = isActive ? 'active' : '';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="stop-marker-container">
        <div class="stop-marker-dot ${activeClass}"></div>
        <div class="stop-marker-name">${stop.name.replace('Twyford ', '')}</div>
      </div>`,
    iconSize: [80, 36],
    iconAnchor: [40, 8],
  });
}

// =============================================
//  DATA FETCHING
// =============================================
async function fetchBuses() {
  try {
    const res = await fetch('/api/buses');
    const json = await res.json();
    state.lastFetchSource = json.source;
    state.buses = json.data || [];
    return json;
  } catch (e) {
    console.error('Failed to fetch buses:', e);
    state.lastFetchSource = 'error';
    state.buses = [];
    return { source: 'error', data: [], error: e.message };
  }
}

async function fetchStops() {
  try {
    const res = await fetch('/api/stops');
    state.stops = await res.json();
  } catch (e) {
    console.error('Failed to fetch stops:', e);
    state.stops = [];
  }
}

async function fetchArrivals(stopId) {
  try {
    const res = await fetch(`/api/stops/${stopId}/arrivals`);
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch arrivals:', e);
    return { source: 'error', arrivals: [], error: e.message };
  }
}

async function fetchRoutes() {
  try {
    const res = await fetch('/api/routes');
    state.routes = await res.json();
  } catch (e) {
    console.error('Failed to fetch routes:', e);
    state.routes = {};
  }
}

// =============================================
//  MAP UPDATES
// =============================================
function updateBusMarkers() {
  const visibleBuses = state.buses.filter(bus => state.operatorFilters.has(bus.operator));
  const visibleIds = new Set(visibleBuses.map(b => b.id));

  // Remove markers that are no longer present
  for (const [id, marker] of Object.entries(state.busMarkers)) {
    if (!visibleIds.has(id)) {
      state.map.removeLayer(marker);
      delete state.busMarkers[id];
    }
  }

  // Add or update markers
  visibleBuses.forEach(bus => {
    const existing = state.busMarkers[bus.id];
    if (existing) {
      existing.setLatLng([bus.lat, bus.lon]);
      existing.setIcon(createBusIcon(bus));
    } else {
      const marker = L.marker([bus.lat, bus.lon], {
        icon: createBusIcon(bus),
        zIndexOffset: 1000,
      });
      marker.on('click', () => openJourneyPanel(bus));
      marker.addTo(state.map);
      state.busMarkers[bus.id] = marker;
    }
  });

  // Show/hide empty state
  if (state.buses.length === 0) {
    $emptyState.classList.remove('hidden');
    if (state.lastFetchSource === 'error') {
      $emptyMsg.textContent = 'Unable to connect to the live data feed. Please check your connection.';
    } else {
      $emptyMsg.textContent = 'No buses are currently being tracked in the Twyford area. Services may not be running at this time.';
    }
  } else {
    $emptyState.classList.add('hidden');
  }
}

function updateStopMarkers() {
  // Clear existing
  Object.values(state.stopMarkers).forEach(m => state.map.removeLayer(m));
  state.stopMarkers = {};

  state.stops.forEach(stop => {
    const isActive = stop.id === state.activeStopId;
    const marker = L.marker([stop.lat, stop.lon], {
      icon: createStopIcon(stop, isActive),
      zIndexOffset: 500,
    });
    marker.on('click', () => openStopPanel(stop));
    marker.addTo(state.map);
    state.stopMarkers[stop.id] = marker;
  });
}

// =============================================
//  STATUS BADGE
// =============================================
function updateStatusBadge() {
  const count = state.buses.length;
  if (state.lastFetchSource === 'error') {
    $statusDot.className = 'w-2.5 h-2.5 bg-red-500 rounded-full';
    $statusText.textContent = 'Feed Error';
    $statusText.classList.remove('text-primary');
    $statusText.classList.add('text-red-600');
  } else if (count === 0) {
    $statusDot.className = 'w-2.5 h-2.5 bg-amber-400 rounded-full';
    $statusText.textContent = 'No Active Buses';
    $statusText.classList.remove('text-primary', 'text-red-600');
    $statusText.classList.add('text-amber-600');
  } else {
    $statusDot.className = 'w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse';
    $statusText.textContent = `Live \u00b7 ${count} bus${count !== 1 ? 'es' : ''}`;
    $statusText.classList.remove('text-red-600', 'text-amber-600');
    $statusText.classList.add('text-primary');
  }
}

// =============================================
//  STOP ARRIVALS PANEL
// =============================================
async function openStopPanel(stop) {
  closeJourneyPanel();
  state.activeStopId = stop.id;
  updateStopMarkers();  // refresh to highlight active stop

  $stopName.textContent = stop.name;
  $arrivalsList.innerHTML = '<div class="flex justify-center py-lg"><div class="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>';

  // Animate panel open
  $stopPanel.classList.remove('translate-x-[110%]', 'opacity-0', 'pointer-events-none');
  $stopPanel.classList.add('translate-x-0', 'opacity-100');
  showBackdrop();

  const data = await fetchArrivals(stop.id);
  renderArrivals(data);
}

function closeStopPanel() {
  state.activeStopId = null;
  $stopPanel.classList.add('translate-x-[110%]', 'opacity-0', 'pointer-events-none');
  $stopPanel.classList.remove('translate-x-0', 'opacity-100');
  hideBackdrop();
  updateStopMarkers();
}

function renderArrivals(data) {
  if (!data.arrivals || data.arrivals.length === 0) {
    $arrivalsList.innerHTML = `
      <div class="text-center py-lg">
        <span class="material-symbols-outlined text-4xl text-outline mb-sm block">schedule</span>
        <p class="text-on-surface-variant font-medium">No upcoming arrivals</p>
        <p class="text-outline text-xs mt-xs">${data.source === 'error' ? 'Unable to reach live feed' : 'No buses currently heading to this stop'}</p>
      </div>`;
    return;
  }

  $arrivalsList.innerHTML = data.arrivals.map(arr => {
    const statusColor = arr.status === 'late' ? 'text-amber-600 bg-amber-50 border-amber-200'
                      : arr.status === 'early' ? 'text-cyan-600 bg-cyan-50 border-cyan-200'
                      : 'text-emerald-600 bg-emerald-50 border-emerald-200';
    const badgeBg = arr.color || '#2563eb';
    return `
      <div class="bg-white/60 rounded-2xl p-md border border-outline-variant/20 shadow-sm">
        <div class="flex items-start gap-md">
          <div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-primary">directions_bus</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-sm">
              <span class="font-label-md font-bold text-lg" style="color: ${badgeBg}">${arr.lineRef}</span>
              <span class="font-body-md text-on-surface font-semibold truncate">${arr.destination}</span>
            </div>
            <div class="flex items-center gap-sm mt-xs">
              <span class="font-label-sm text-primary font-bold">${arr.eta} min${arr.eta !== 1 ? 's' : ''}</span>
              <span class="text-xs px-2 py-0.5 rounded-full border font-bold ${statusColor}">${arr.delay}</span>
            </div>
          </div>
        </div>
        <button class="track-route-btn mt-md w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                style="background: ${badgeBg}; color: white;"
                data-vehicle-id="${arr.vehicleId}">
          <span class="material-symbols-outlined text-[16px] align-middle mr-1">gps_fixed</span>
          Track Route
        </button>
      </div>`;
  }).join('');

  // Attach track-route handlers
  $arrivalsList.querySelectorAll('.track-route-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const vehicleId = btn.dataset.vehicleId;
      const bus = state.buses.find(b => b.id === vehicleId);
      if (bus) {
        closeStopPanel();
        openJourneyPanel(bus);
      }
    });
  });
}

// =============================================
//  JOURNEY TRACKING PANEL
// =============================================
function openJourneyPanel(bus) {
  closeStopPanel();
  state.activeJourneyBusId = bus.id;

  // Header
  $routeBadge.textContent = bus.lineRef;
  $routeBadge.style.background = bus.color;
  $routeDest.textContent = bus.destinationName;
  $routeDesc.textContent = bus.originName ? `From ${bus.originName}` : `Route ${bus.lineRef}`;
  $journeyOp.textContent = bus.operator;

  // Delay
  if (bus.status === 'late') {
    $journeyDelay.textContent = bus.delay;
    $journeyDelay.className = 'font-label-md text-amber-600 font-bold text-md mt-xs';
  } else if (bus.status === 'early') {
    $journeyDelay.textContent = bus.delay;
    $journeyDelay.className = 'font-label-md text-cyan-600 font-bold text-md mt-xs';
  } else {
    $journeyDelay.textContent = 'On Time';
    $journeyDelay.className = 'font-label-md text-emerald-600 font-bold text-md mt-xs';
  }

  // Build timeline from available data
  renderJourneyTimeline(bus);

  // Animate panel open
  $journeyPanel.classList.remove('translate-x-[-110%]', 'opacity-0', 'pointer-events-none');
  $journeyPanel.classList.add('translate-x-0', 'opacity-100');
  showBackdrop();

  // Centre map on bus
  state.map.panTo([bus.lat, bus.lon], { animate: true });
}

function closeJourneyPanel() {
  state.activeJourneyBusId = null;
  $journeyPanel.classList.add('translate-x-[-110%]', 'opacity-0', 'pointer-events-none');
  $journeyPanel.classList.remove('translate-x-0', 'opacity-100');
  hideBackdrop();
}

function renderJourneyTimeline(bus) {
  // Try to build timeline from onwardCalls / monitoredCall
  // Fallback: use known Twyford stops on this route
  const timelineStops = [];

  // If there's a monitored call (current/next stop)
  if (bus.monitoredCall && bus.monitoredCall.stopName) {
    timelineStops.push({
      name: bus.monitoredCall.stopName,
      status: bus.monitoredCall.vehicleAtStop ? 'current' : 'next',
      time: formatTime(bus.monitoredCall.expectedArrival || bus.monitoredCall.aimedArrival),
    });
  }

  // Onward calls (future stops)
  if (bus.onwardCalls && bus.onwardCalls.length > 0) {
    bus.onwardCalls.forEach(call => {
      if (call.stopName) {
        timelineStops.push({
          name: call.stopName,
          status: 'upcoming',
          time: formatTime(call.expectedArrival || call.aimedArrival),
        });
      }
    });
  }

  // If no SIRI call data, use local Twyford stops for this route
  if (timelineStops.length === 0) {
    const routeStops = state.stops.filter(s => s.routes.includes(bus.lineRef));
    routeStops.forEach(stop => {
      const dx = stop.lat - bus.lat;
      const dy = stop.lon - bus.lon;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const etaMins = Math.max(1, Math.round((dist / 0.0001) / 60));

      // Very rough: if bus is very close and heading away, consider it departed
      const isPast = dist < 0.002 && etaMins <= 1;
      timelineStops.push({
        name: stop.name,
        status: isPast ? 'departed' : 'upcoming',
        time: isPast ? 'Departed' : `~${etaMins} min`,
        distance: dist,
      });
    });
    // Sort by distance
    timelineStops.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  // Add origin and destination
  if (bus.originName && !timelineStops.find(s => s.name === bus.originName)) {
    timelineStops.unshift({ name: bus.originName, status: 'departed', time: 'Origin' });
  }
  if (!timelineStops.find(s => s.name === bus.destinationName)) {
    timelineStops.push({ name: bus.destinationName, status: 'upcoming', time: 'Terminus' });
  }

  // Render
  let progressPercent = 0;
  const departedCount = timelineStops.filter(s => s.status === 'departed').length;
  if (timelineStops.length > 1) {
    progressPercent = Math.min(95, (departedCount / (timelineStops.length - 1)) * 100);
  }

  $timelineLine.style.height = `${progressPercent}%`;

  $timelineStops.innerHTML = timelineStops.map(stop => {
    let dotClass, labelClass, timeClass;
    if (stop.status === 'departed') {
      dotClass = 'w-6 h-6 rounded-full bg-primary border-2 border-primary flex items-center justify-center';
      labelClass = 'text-on-surface-variant';
      timeClass = 'text-primary font-bold';
    } else if (stop.status === 'current' || stop.status === 'next') {
      dotClass = 'w-6 h-6 rounded-full bg-white border-3 border-primary flex items-center justify-center ring-4 ring-primary/20';
      labelClass = 'text-primary font-bold';
      timeClass = 'text-primary font-bold';
    } else {
      dotClass = 'w-6 h-6 rounded-full bg-white border-2 border-outline-variant/50';
      labelClass = 'text-on-surface-variant';
      timeClass = 'text-outline';
    }

    const checkIcon = stop.status === 'departed' ? '<span class="material-symbols-outlined text-white text-[14px]">check</span>' : '';

    return `
      <div class="flex items-start gap-md relative">
        <div class="${dotClass} shrink-0">${checkIcon}</div>
        <div class="flex-1 pb-1 min-w-0">
          <p class="font-body-md font-semibold ${labelClass} truncate">${stop.name}</p>
          <p class="text-xs ${timeClass} uppercase tracking-wider mt-0.5">${stop.time || ''}</p>
        </div>
      </div>`;
  }).join('');
}

function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// =============================================
//  BACKDROP (mobile)
// =============================================
function showBackdrop() {
  $panelBackdrop.classList.remove('hidden');
}
function hideBackdrop() {
  if (!state.activeStopId && !state.activeJourneyBusId && !state.mobileFiltersOpen) {
    $panelBackdrop.classList.add('hidden');
  }
}

// =============================================
//  OPERATOR & ROUTE FILTERS
// =============================================
function discoverOperators() {
  state.allOperators.clear();
  state.buses.forEach(bus => state.allOperators.add(bus.operator));

  // Also include known operators
  Object.values(state.routes).forEach(r => state.allOperators.add(r.operator));

  // If first time, enable all
  if (state.operatorFilters.size === 0) {
    state.allOperators.forEach(op => state.operatorFilters.add(op));
  }
  // Ensure any new operators are added
  state.allOperators.forEach(op => {
    if (!state.operatorFilters.has(op)) {
      state.operatorFilters.add(op);
    }
  });
}

function renderOperatorFilters() {
  const operators = [...state.allOperators].sort();

  const renderCheckbox = (op, containerId) => {
    const checked = state.operatorFilters.has(op) ? 'checked' : '';
    return `
      <label class="flex items-center gap-md cursor-pointer">
        <input type="checkbox" ${checked} data-operator="${op}"
               class="operator-checkbox rounded border-outline-variant text-primary focus:ring-primary/50 w-5 h-5"/>
        <span class="text-body-md font-medium text-on-surface">${op}</span>
      </label>`;
  };

  if ($operatorFilters) {
    $operatorFilters.innerHTML = operators.map(op => renderCheckbox(op)).join('');
    $operatorFilters.querySelectorAll('.operator-checkbox').forEach(cb => {
      cb.addEventListener('change', handleOperatorFilterChange);
    });
  }

  if ($mobileOperatorFilters) {
    $mobileOperatorFilters.innerHTML = operators.map(op => renderCheckbox(op)).join('');
    $mobileOperatorFilters.querySelectorAll('.operator-checkbox').forEach(cb => {
      cb.addEventListener('change', handleOperatorFilterChange);
    });
  }
}

function renderMobileRouteFilters() {
  if (!$mobileRouteFilters) return;
  const routes = Object.entries(state.routes);
  if (routes.length === 0) return;

  $mobileRouteFilters.innerHTML = routes.map(([key, route]) => `
    <div class="flex items-center gap-md p-sm bg-white/60 rounded-xl border border-outline-variant/20">
      <span class="inline-block w-10 text-center font-label-md font-bold text-white rounded-lg py-1" style="background: ${route.color}">${key}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-on-surface truncate">${route.destination}</p>
        <p class="text-xs text-on-surface-variant">${route.operator}</p>
      </div>
    </div>`).join('');
}

function handleOperatorFilterChange(e) {
  const op = e.target.dataset.operator;
  if (e.target.checked) {
    state.operatorFilters.add(op);
  } else {
    state.operatorFilters.delete(op);
  }
  // Sync checkboxes across desktop/mobile
  document.querySelectorAll(`.operator-checkbox[data-operator="${op}"]`).forEach(cb => {
    cb.checked = e.target.checked;
  });
  updateBusMarkers();
}

// =============================================
//  MOBILE FILTER DRAWER
// =============================================
function openMobileFilters() {
  state.mobileFiltersOpen = true;
  $mobileFilterDrawer.classList.remove('translate-y-[100%]');
  $mobileFilterDrawer.classList.add('translate-y-0');
  showBackdrop();
}

function closeMobileFilters() {
  state.mobileFiltersOpen = false;
  $mobileFilterDrawer.classList.add('translate-y-[100%]');
  $mobileFilterDrawer.classList.remove('translate-y-0');
  hideBackdrop();
}

// =============================================
//  SEARCH
// =============================================
function handleSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Reset: show all stops, all bus markers
    updateStopMarkers();
    updateBusMarkers();
    return;
  }

  // Filter stops
  Object.entries(state.stopMarkers).forEach(([id, marker]) => {
    const stop = state.stops.find(s => s.id === id);
    if (!stop) return;
    const matches = stop.name.toLowerCase().includes(q) ||
                    stop.routes.some(r => r.toLowerCase().includes(q));
    if (matches) {
      marker.setOpacity(1);
    } else {
      marker.setOpacity(0.2);
    }
  });

  // Filter buses
  Object.entries(state.busMarkers).forEach(([id, marker]) => {
    const bus = state.buses.find(b => b.id === id);
    if (!bus) return;
    const matches = bus.lineRef.toLowerCase().includes(q) ||
                    bus.operator.toLowerCase().includes(q) ||
                    bus.destinationName.toLowerCase().includes(q);
    if (matches) {
      marker.setOpacity(1);
    } else {
      marker.setOpacity(0.3);
    }
  });
}

// =============================================
//  ROUTES VIEW
// =============================================
async function renderRoutesView() {
  if (Object.keys(state.routes).length === 0) {
    await fetchRoutes();
  }

  // Count live buses per route
  const liveCounts = {};
  state.buses.forEach(bus => {
    liveCounts[bus.lineRef] = (liveCounts[bus.lineRef] || 0) + 1;
  });

  const routes = Object.entries(state.routes);
  $routesList.innerHTML = routes.map(([key, route]) => {
    const liveCount = liveCounts[key] || 0;
    const liveBadge = liveCount > 0
      ? `<span class="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
           <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
           ${liveCount} live
         </span>`
      : '<span class="text-xs font-bold text-outline bg-surface-container px-2 py-0.5 rounded-full">Inactive</span>';

    const stopsHtml = route.stopsServed
      ? route.stopsServed.map(s =>
          `<span class="text-xs bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-full">${s.name}</span>`
        ).join('')
      : '';

    return `
      <div class="route-card bg-white rounded-2xl p-md border border-outline-variant/20 shadow-sm">
        <div class="flex items-start gap-md">
          <div class="shrink-0">
            <span class="inline-block w-14 text-center font-label-md font-bold text-white rounded-xl py-2 text-lg" style="background: ${route.color}">${key}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-sm flex-wrap">
              <h3 class="font-headline-md text-on-surface font-bold">${route.origin} &rarr; ${route.destination}</h3>
              ${liveBadge}
            </div>
            <p class="text-sm text-on-surface-variant mt-xs">${route.operator}</p>
            ${stopsHtml ? `<div class="flex flex-wrap gap-1 mt-sm">${stopsHtml}</div>` : ''}
          </div>
        </div>
        ${liveCount > 0 ? `
        <button class="view-on-map-btn mt-md w-full py-2 rounded-xl border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors active:scale-[0.98]"
                data-route="${key}">
          <span class="material-symbols-outlined text-[16px] align-middle mr-1">map</span>
          View on Map
        </button>` : ''}
      </div>`;
  }).join('');

  // Attach view-on-map handlers
  $routesList.querySelectorAll('.view-on-map-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      switchView('map');
      // Focus on buses of this route
      const routeBuses = state.buses.filter(b => b.lineRef === route);
      if (routeBuses.length > 0) {
        const bounds = L.latLngBounds(routeBuses.map(b => [b.lat, b.lon]));
        state.map.fitBounds(bounds.pad(0.3));
      }
    });
  });
}

// =============================================
//  NAVIGATION
// =============================================
function switchView(view) {
  state.currentView = view;

  // Update desktop nav buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('nav-btn-active');
    btn.classList.add('text-on-surface-variant', 'hover:bg-surface-container');
  });

  // Update mobile nav buttons
  document.querySelectorAll('.mob-nav-btn').forEach(btn => {
    btn.classList.remove('text-primary', 'bg-primary/10', 'rounded-2xl');
    btn.classList.add('text-on-surface-variant');
  });

  if (view === 'map') {
    document.getElementById('nav-map')?.classList.add('nav-btn-active');
    document.getElementById('nav-map')?.classList.remove('text-on-surface-variant', 'hover:bg-surface-container');
    document.getElementById('mob-nav-map')?.classList.add('text-primary', 'bg-primary/10', 'rounded-2xl');
    document.getElementById('mob-nav-map')?.classList.remove('text-on-surface-variant');

    $routesView.classList.add('hidden');
    $map.parentElement.classList.remove('hidden');
    state.map.invalidateSize();
  } else if (view === 'routes') {
    document.getElementById('nav-routes')?.classList.add('nav-btn-active');
    document.getElementById('nav-routes')?.classList.remove('text-on-surface-variant', 'hover:bg-surface-container');
    document.getElementById('mob-nav-routes')?.classList.add('text-primary', 'bg-primary/10', 'rounded-2xl');
    document.getElementById('mob-nav-routes')?.classList.remove('text-on-surface-variant');

    closeStopPanel();
    closeJourneyPanel();
    $routesView.classList.remove('hidden');
    renderRoutesView();
  }
}

// =============================================
//  AUTO-REFRESH
// =============================================
async function refreshData() {
  const result = await fetchBuses();
  discoverOperators();
  renderOperatorFilters();
  updateBusMarkers();
  updateStatusBadge();

  // If journey panel is open, refresh its data
  if (state.activeJourneyBusId) {
    const bus = state.buses.find(b => b.id === state.activeJourneyBusId);
    if (bus) {
      renderJourneyTimeline(bus);
      // Update bus position on map view
      if (state.busMarkers[bus.id]) {
        state.busMarkers[bus.id].setLatLng([bus.lat, bus.lon]);
      }
    }
  }

  // If stop panel is open, refresh arrivals
  if (state.activeStopId) {
    const data = await fetchArrivals(state.activeStopId);
    renderArrivals(data);
  }
}

function startRefresh() {
  stopRefresh();
  state.refreshTimer = setInterval(refreshData, CONFIG.REFRESH_MS);
}

function stopRefresh() {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
}

// =============================================
//  EVENT BINDINGS
// =============================================
function bindEvents() {
  // Desktop nav
  document.getElementById('nav-map')?.addEventListener('click', () => switchView('map'));
  document.getElementById('nav-routes')?.addEventListener('click', () => switchView('routes'));

  // Mobile nav
  document.getElementById('mob-nav-map')?.addEventListener('click', () => switchView('map'));
  document.getElementById('mob-nav-routes')?.addEventListener('click', () => switchView('routes'));
  document.getElementById('mob-nav-filters')?.addEventListener('click', () => openMobileFilters());

  // Panel close buttons
  document.getElementById('close-stop-panel')?.addEventListener('click', closeStopPanel);
  document.getElementById('close-journey-panel')?.addEventListener('click', closeJourneyPanel);
  document.getElementById('close-mobile-filters')?.addEventListener('click', closeMobileFilters);

  // Backdrop click closes panels
  $panelBackdrop?.addEventListener('click', () => {
    closeStopPanel();
    closeJourneyPanel();
    closeMobileFilters();
  });

  // Search
  $searchInput?.addEventListener('input', (e) => handleSearch(e.target.value));

  // Share button
  document.getElementById('share-status-btn')?.addEventListener('click', () => {
    if (navigator.share) {
      const bus = state.buses.find(b => b.id === state.activeJourneyBusId);
      if (bus) {
        navigator.share({
          title: `Bus ${bus.lineRef} to ${bus.destinationName}`,
          text: `Tracking bus ${bus.lineRef} to ${bus.destinationName} - ${bus.delay}`,
          url: window.location.href,
        }).catch(() => {});
      }
    }
  });
}

// =============================================
//  INITIALISATION
// =============================================
async function init() {
  initMap();
  bindEvents();

  // Fetch initial data in parallel
  await Promise.all([fetchStops(), fetchRoutes(), fetchBuses()]);

  // Set up operators and render
  discoverOperators();
  renderOperatorFilters();
  renderMobileRouteFilters();

  // Render markers
  updateStopMarkers();
  updateBusMarkers();
  updateStatusBadge();

  // Start auto-refresh
  startRefresh();
}

document.addEventListener('DOMContentLoaded', init);
