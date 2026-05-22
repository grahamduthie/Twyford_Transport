const express = require('express');
const path = require('path');
const xml2js = require('xml2js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/stitch', express.static(path.join(__dirname, 'stitch_twyford_live_bus_tracker')));

// Known Twyford bus stops
const TWYFORD_STOPS = [
  {
    id: "035091120001",
    name: "Twyford Station (Stop A)",
    indicator: "opp",
    smsCode: "wokdtdp",
    lat: 51.4745,
    lon: -0.8632,
    routes: ["128", "129", "850"]
  },
  {
    id: "035091120002",
    name: "Twyford Station (Stop B)",
    indicator: "adj",
    smsCode: "wokdtdt",
    lat: 51.4746,
    lon: -0.8629,
    routes: ["128", "129", "127"]
  },
  {
    id: "035091100005",
    name: "Wargrave Road",
    indicator: "N-bound",
    smsCode: "wokdpam",
    lat: 51.4785,
    lon: -0.8640,
    routes: ["127", "850"]
  },
  {
    id: "035091100003",
    name: "Twyford Crossroads",
    indicator: "adj",
    smsCode: "wokdpad",
    lat: 51.4729,
    lon: -0.8622,
    routes: ["128", "129", "12", "227"]
  },
  {
    id: "035091100008",
    name: "Waltham Road",
    indicator: "S-bound",
    smsCode: "wokdpat",
    lat: 51.4705,
    lon: -0.8610,
    routes: ["128", "129", "12"]
  }
];

// Known route metadata (operators verified against BODS data)
const ROUTES_INFO = {
  "128": { lineName: "128", operator: "Courtney Buses", origin: "Reading Station", destination: "Wokingham Station", color: "#2563eb" },
  "129": { lineName: "129", operator: "Courtney Buses", origin: "Reading Station", destination: "Wokingham Station", color: "#3b82f6" },
  "127": { lineName: "127", operator: "Carousel Buses", origin: "Reading Station", destination: "Maidenhead", color: "#10b981" },
  "850": { lineName: "850", operator: "Carousel Buses", origin: "Reading Station", destination: "High Wycombe", color: "#d97706" },
  "12":  { lineName: "12",  operator: "Reading Buses", origin: "Reading Station", destination: "Twyford Hub", color: "#8b5cf6" },
  "227": { lineName: "227", operator: "Courtney Buses", origin: "Twyford Station", destination: "Maidenhead", color: "#ec4899" }
};

// Map BODS operator codes to display names
const OPERATOR_NAMES = {
  "RBUS": "Reading Buses",
  "RBSN": "Reading Buses",
  "CSLB": "Carousel Buses",
  "CABU": "Carousel Buses",
  "TVSR": "Thames Valley Buses",
  "THVB": "Thames Valley Buses",
  "ARDT": "Arriva",
  "ARBB": "Arriva",
  "FECS": "First",
  "GWR":  "GWR Rail",
  "CTNY": "Courtney Buses",
  "CORT": "Courtney Buses"
};

// Clean up messy BODS destination names
function cleanDestination(raw) {
  if (!raw || raw === "Unknown Destination") return raw;
  // Replace underscores with spaces
  let name = raw.replace(/_/g, ' ');
  // Remove double spaces
  name = name.replace(/\s{2,}/g, ' ').trim();
  // Remove duplicate city prefix (e.g. "High Wycombe  High Wycombe Bus Stn" → "High Wycombe Bus Stn")
  const parts = name.split(',').map(p => p.trim());
  if (parts.length > 1) name = parts[parts.length - 1];
  // Handle "CityName  CityName XYZ" pattern
  const words = name.split(' ');
  for (let len = 1; len <= Math.floor(words.length / 2); len++) {
    const prefix = words.slice(0, len).join(' ');
    const after  = words.slice(len, len * 2).join(' ');
    if (prefix === after) {
      name = words.slice(len).join(' ');
      break;
    }
  }
  // Expand common abbreviations (avoid "St" → "Street" as it's ambiguous with "Saint")
  name = name.replace(/\bBusStn\b/g, 'Bus Station')
             .replace(/\bStn\b/g, 'Station')
             .replace(/\bRd\b/g, 'Road');
  return name.trim();
}

// Generate a deterministic colour for unknown routes
function getRouteColor(lineRef) {
  if (ROUTES_INFO[lineRef]) return ROUTES_INFO[lineRef].color;
  let hash = 0;
  for (let i = 0; i < lineRef.length; i++) {
    hash = lineRef.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

// Operators to query from BODS (verified active in the Twyford area)
const BODS_OPERATORS = ["RBUS", "CSLB", "CTNY"];

// Bounding box for filtering vehicles in the Twyford area
// Slightly wider to catch approaching buses
const TWYFORD_BBOX = { minLat: 51.42, maxLat: 51.53, minLon: -0.94, maxLon: -0.76 };

// Parse a single SIRI-VM XML response into bus objects
function parseVehicleActivities(xmlText) {
  const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
  return parser.parseStringPromise(xmlText).then(result => {
    const deliveries = result?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery;
    if (!deliveries) return [];

    const activities = Array.isArray(deliveries.VehicleActivity)
      ? deliveries.VehicleActivity
      : deliveries.VehicleActivity
      ? [deliveries.VehicleActivity]
      : [];

    return activities.map((activity, index) => {
      const journey = activity.MonitoredVehicleJourney;
      if (!journey || !journey.VehicleLocation) return null;

      const lat = parseFloat(journey.VehicleLocation.Latitude);
      const lon = parseFloat(journey.VehicleLocation.Longitude);
      if (isNaN(lat) || isNaN(lon)) return null;

      // Filter to bounding box
      if (lat < TWYFORD_BBOX.minLat || lat > TWYFORD_BBOX.maxLat ||
          lon < TWYFORD_BBOX.minLon || lon > TWYFORD_BBOX.maxLon) {
        return null;
      }

      const lineRef = journey.LineRef || "?";
      const operatorRef = journey.OperatorRef || "";
      const operatorName = OPERATOR_NAMES[operatorRef]
        || ROUTES_INFO[lineRef]?.operator
        || operatorRef
        || "Unknown Operator";
      const rawDest = cleanDestination(journey.DestinationName);
      const destinationName = (rawDest && rawDest !== "Unknown Destination")
        ? rawDest
        : (ROUTES_INFO[lineRef]?.destination || "Unknown Destination");
      const rawOrigin = cleanDestination(journey.OriginName || journey.OriginRef);
      const originName = rawOrigin || ROUTES_INFO[lineRef]?.origin || "";
      const directionRef = journey.DirectionRef || "";
      const vehicleRef = journey.VehicleRef || `bods-${lineRef}-${index}`;
      const bearing = parseFloat(journey.Bearing) || null;
      const recordedAt = activity.RecordedAtTime || null;

      // Parse delay from ISO 8601 duration
      let delay = "On Time";
      let delayMins = 0;
      let status = "on-time";
      if (journey.Delay) {
        const delayStr = String(journey.Delay);
        const match = delayStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const hours = parseInt(match[1] || 0);
          const mins = parseInt(match[2] || 0);
          const totalMins = hours * 60 + mins;
          if (totalMins > 0) {
            if (delayStr.startsWith('-')) {
              delay = `${totalMins}m Early`;
              delayMins = -totalMins;
              status = "early";
            } else {
              delay = `${totalMins}m Delay`;
              delayMins = totalMins;
              status = "late";
            }
          }
        }
      }

      // Extract MonitoredCall if available (current/next stop)
      let monitoredCall = null;
      if (journey.MonitoredCall) {
        const mc = journey.MonitoredCall;
        monitoredCall = {
          stopName: mc.StopPointName || null,
          stopRef: mc.StopPointRef || null,
          vehicleAtStop: mc.VehicleAtStop === "true",
          aimedArrival: mc.AimedArrivalTime || null,
          expectedArrival: mc.ExpectedArrivalTime || null,
          aimedDeparture: mc.AimedDepartureTime || null,
          expectedDeparture: mc.ExpectedDepartureTime || null
        };
      }

      // Extract OnwardCalls if available (future stops)
      let onwardCalls = [];
      if (journey.OnwardCalls && journey.OnwardCalls.OnwardCall) {
        const calls = Array.isArray(journey.OnwardCalls.OnwardCall)
          ? journey.OnwardCalls.OnwardCall
          : [journey.OnwardCalls.OnwardCall];
        onwardCalls = calls.map(call => ({
          stopName: call.StopPointName || null,
          stopRef: call.StopPointRef || null,
          aimedArrival: call.AimedArrivalTime || null,
          expectedArrival: call.ExpectedArrivalTime || null
        }));
      }

      return {
        id: vehicleRef,
        lineRef,
        operator: operatorName,
        operatorRef,
        destinationName,
        originName,
        directionRef,
        lat,
        lon,
        bearing,
        delay,
        delayMins,
        status,
        color: getRouteColor(lineRef),
        recordedAt,
        monitoredCall,
        onwardCalls
      };
    }).filter(Boolean);
  });
}

// Fetch live data from BODS by querying each operator in parallel
async function fetchBodsData() {
  const apiKey = process.env.BODS_API_KEY;
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE" || apiKey.length < 10) {
    throw new Error("Invalid or unconfigured BODS API Key");
  }

  const results = await Promise.allSettled(
    BODS_OPERATORS.map(async (op) => {
      const url = `https://data.bus-data.dft.gov.uk/api/v1/datafeed/?api_key=${apiKey}&operatorRef=${op}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`BODS fetch for ${op} failed: ${response.status}`);
        return [];
      }
      const xmlText = await response.text();
      return parseVehicleActivities(xmlText);
    })
  );

  // Merge all successful results
  const allBuses = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      allBuses.push(...result.value);
    }
  }

  // De-duplicate by vehicle ID (same bus might appear in multiple feeds)
  const seen = new Map();
  for (const bus of allBuses) {
    if (!seen.has(bus.id)) {
      seen.set(bus.id, bus);
    }
  }

  return Array.from(seen.values());
}

// Cache for BODS data (avoid redundant calls within short window)
let bodsCache = { data: null, timestamp: 0 };
const CACHE_TTL = 10000; // 10 seconds

async function getCachedBodsData() {
  const now = Date.now();
  if (bodsCache.data && (now - bodsCache.timestamp) < CACHE_TTL) {
    return bodsCache.data;
  }
  const data = await fetchBodsData();
  bodsCache = { data, timestamp: now };
  return data;
}

// --- API Endpoints ---

// Live bus positions (BODS only)
app.get('/api/buses', async (req, res) => {
  try {
    const liveBuses = await getCachedBodsData();
    res.json({
      source: "live",
      count: liveBuses.length,
      data: liveBuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("BODS fetch failed:", error.message);
    res.json({
      source: "error",
      count: 0,
      data: [],
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Bus stops
app.get('/api/stops', (req, res) => {
  res.json(TWYFORD_STOPS);
});

// Live arrivals at a specific stop (BODS only)
app.get('/api/stops/:id/arrivals', async (req, res) => {
  const stopId = req.params.id;
  const stop = TWYFORD_STOPS.find(s => s.id === stopId);

  if (!stop) {
    return res.status(404).json({ error: "Stop not found" });
  }

  try {
    const liveBuses = await getCachedBodsData();
    const arrivals = [];

    liveBuses.forEach(bus => {
      if (!stop.routes.includes(bus.lineRef)) return;

      // Estimate ETA based on distance
      const dx = stop.lat - bus.lat;
      const dy = stop.lon - bus.lon;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // ~0.0001 degrees/second ≈ 30mph
      const etaSeconds = Math.round(distance / 0.0001);
      const etaMins = Math.max(1, Math.round(etaSeconds / 60));

      if (etaMins <= 60) {
        arrivals.push({
          lineRef: bus.lineRef,
          destination: bus.destinationName,
          eta: etaMins,
          delay: bus.delay,
          status: bus.status,
          vehicleId: bus.id,
          operator: bus.operator,
          color: bus.color
        });
      }
    });

    arrivals.sort((a, b) => a.eta - b.eta);

    res.json({
      source: "live",
      stop: { id: stop.id, name: stop.name },
      arrivals,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Arrivals fetch failed:", error.message);
    res.json({
      source: "error",
      stop: { id: stop.id, name: stop.name },
      arrivals: [],
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route metadata
app.get('/api/routes', (req, res) => {
  // Enrich routes with which stops they serve in Twyford
  const enriched = {};
  for (const [key, route] of Object.entries(ROUTES_INFO)) {
    const stopsServed = TWYFORD_STOPS
      .filter(s => s.routes.includes(key))
      .map(s => ({ id: s.id, name: s.name }));
    enriched[key] = { ...route, color: getRouteColor(key), stopsServed };
  }
  res.json(enriched);
});

app.listen(PORT, () => {
  console.log(`Twyford Transport Live Server running at http://localhost:${PORT}`);
});
