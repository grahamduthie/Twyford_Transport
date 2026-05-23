const express = require('express');
const path = require('path');
const xml2js = require('xml2js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/stitch', express.static(path.join(__dirname, 'stitch_twyford_live_bus_tracker')));

// All timetable bus stops for tracked routes
const ROUTE_STOPS = [
  { id: "035059810002", name: "Coleridge Close", lat: 51.469259, lon: -0.855069, routes: ["128", "129"] },
  { id: "035059870001", name: "Old Silk Mill", lat: 51.477772, lon: -0.870595, routes: ["12"] },
  { id: "035059870002", name: "Old Silk Mill", lat: 51.477824, lon: -0.870378, routes: ["127", "128", "850"] },
  { id: "035059880002", name: "Hurst Road Turn", lat: 51.466382, lon: -0.859734, routes: ["128", "129"] },
  { id: "035059980002", name: "Pond", lat: 51.457365, lon: -0.851610, routes: ["128", "129"] },
  { id: "035075240001", name: "Winnersh Cross Roads", lat: 51.428030, lon: -0.875742, routes: ["128", "129"] },
  { id: "035075260001", name: "Woodward Close", lat: 51.425838, lon: -0.871731, routes: ["128", "129"] },
  { id: "035075280001", name: "Sadlers Lane", lat: 51.423531, lon: -0.865701, routes: ["128", "129"] },
  { id: "035075300001", name: "Simons Lane", lat: 51.421536, lon: -0.860626, routes: ["128", "129"] },
  { id: "035075320001", name: "Rifle Volunteer", lat: 51.418846, lon: -0.853954, routes: ["128", "129"] },
  { id: "035075340001", name: "Oxford Road", lat: 51.416374, lon: -0.847402, routes: ["128", "129"] },
  { id: "035075360001", name: "Holt Lane", lat: 51.414848, lon: -0.843481, routes: ["128", "129"] },
  { id: "035075380001", name: "Shute End", lat: 51.413075, lon: -0.840433, routes: ["128", "129"] },
  { id: "035075400001", name: "Broad Street", lat: 51.411075, lon: -0.835017, routes: ["128", "129"] },
  { id: "035085640004", name: "Chequers", lat: 51.454050, lon: -0.906526, routes: ["127", "128"] },
  { id: "035085660002", name: "Woodwaye", lat: 51.453939, lon: -0.909778, routes: ["127", "128"] },
  { id: "035085680002", name: "Beaufield Close", lat: 51.454177, lon: -0.913477, routes: ["127", "128"] },
  { id: "035085700002", name: "Chequers Way", lat: 51.455712, lon: -0.914643, routes: ["127", "128"] },
  { id: "035085720002", name: "Howth Drive Top", lat: 51.457610, lon: -0.914018, routes: ["127", "128"] },
  { id: "035085740002", name: "Hanwood Close", lat: 51.458827, lon: -0.917285, routes: ["127", "128"] },
  { id: "035086600001", name: "Western Avenue", lat: 51.457050, lon: -0.909358, routes: ["127", "128"] },
  { id: "035086620001", name: "Warren Road", lat: 51.459688, lon: -0.908210, routes: ["127", "128"] },
  { id: "035086640001", name: "Ryecroft Close", lat: 51.461928, lon: -0.905448, routes: ["127", "128"] },
  { id: "035086660001", name: "Butts Hill Bridge", lat: 51.463334, lon: -0.902837, routes: ["127", "128"] },
  { id: "035086680001", name: "Mustard Lane", lat: 51.464541, lon: -0.902434, routes: ["127", "128"] },
  { id: "035090100001", name: "London Road - The Drive", lat: 51.456145, lon: -0.934678, routes: ["127", "128", "129", "850"] },
  { id: "035090100003", name: "London Road - The Drive", lat: 51.455387, lon: -0.936308, routes: ["12"] },
  { id: "035090120001", name: "Shepherds House Lane", lat: 51.456968, lon: -0.931391, routes: ["127", "128", "129", "850"] },
  { id: "035090120002", name: "Shepherds House Lane", lat: 51.456764, lon: -0.930793, routes: ["12"] },
  { id: "035090140001", name: "Earley Power Station", lat: 51.458111, lon: -0.925972, routes: ["127", "128", "129", "850"] },
  { id: "035090140002", name: "Earley Power Station", lat: 51.457842, lon: -0.926051, routes: ["12"] },
  { id: "035090160001", name: "Shepherds Hill Top", lat: 51.459337, lon: -0.921677, routes: ["127", "128", "129", "850"] },
  { id: "035090160002", name: "Shepherds Hill Top", lat: 51.458959, lon: -0.920338, routes: ["12"] },
  { id: "035090180001", name: "Sonning Lane", lat: 51.463710, lon: -0.913624, routes: ["127", "128", "850"] },
  { id: "035090180002", name: "Sonning Lane", lat: 51.462703, lon: -0.915534, routes: ["12"] },
  { id: "035090180003", name: "Sonning Lane", lat: 51.463778, lon: -0.913349, routes: ["129"] },
  { id: "035090200001", name: "Holmemoor Drive", lat: 51.465579, lon: -0.909535, routes: ["127", "128", "850"] },
  { id: "035090200002", name: "Holmemoor Drive", lat: 51.465258, lon: -0.909917, routes: ["12"] },
  { id: "035090220001", name: "Hawthorn Way", lat: 51.468618, lon: -0.903215, routes: ["127", "128", "129", "850"] },
  { id: "035090220002", name: "Hawthorn Way", lat: 51.466626, lon: -0.905220, routes: ["12"] },
  { id: "035090240001", name: "Model Farm", lat: 51.471660, lon: -0.895482, routes: ["127", "128", "129", "850"] },
  { id: "035090240002", name: "Model Farm", lat: 51.471514, lon: -0.895212, routes: ["12"] },
  { id: "035090260001", name: "Milestone Avenue", lat: 51.475694, lon: -0.890316, routes: ["129"] },
  { id: "035090260002", name: "Milestone Avenue", lat: 51.473805, lon: -0.892161, routes: ["12"] },
  { id: "035090260003", name: "Wee Waif", lat: 51.474748, lon: -0.889187, routes: ["127", "128", "850"] },
  { id: "035090260004", name: "Wee Waif", lat: 51.474468, lon: -0.889985, routes: ["12"] },
  { id: "035090300002", name: "Holme Park Farm Lane", lat: 51.467015, lon: -0.905429, routes: ["127", "128"] },
  { id: "035090320001", name: "Bluecoat School", lat: 51.468094, lon: -0.905068, routes: ["129"] },
  { id: "035090320002", name: "Bluecoat School", lat: 51.469223, lon: -0.913962, routes: ["127", "128"] },
  { id: "035090340001", name: "High Street", lat: 51.469705, lon: -0.906375, routes: ["129"] },
  { id: "035090340002", name: "High Street", lat: 51.472319, lon: -0.912809, routes: ["127", "128"] },
  { id: "035090360001", name: "Fire Station", lat: 51.470040, lon: -0.907038, routes: ["129"] },
  { id: "035090360003", name: "Fire Station", lat: 51.472736, lon: -0.907524, routes: ["127", "128"] },
  { id: "035090380001", name: "Little Glebe", lat: 51.469634, lon: -0.906645, routes: ["129"] },
  { id: "035090380002", name: "Little Glebe", lat: 51.470071, lon: -0.907225, routes: ["127", "128"] },
  { id: "035090400001", name: "Park View Drive", lat: 51.479224, lon: -0.886097, routes: ["129"] },
  { id: "035090430001", name: "Carliles Corner West", lat: 51.485751, lon: -0.872789, routes: ["129"] },
  { id: "035090480001", name: "Hare Hatch Grange", lat: 51.496253, lon: -0.837769, routes: ["127", "227"] },
  { id: "035090500001", name: "The Forge", lat: 51.499035, lon: -0.830020, routes: ["127", "227"] },
  { id: "035090520001", name: "Castle Royale Golf Club", lat: 51.500996, lon: -0.825532, routes: ["127", "227"] },
  { id: "035090540001", name: "Bird In Hand", lat: 51.504496, lon: -0.820414, routes: ["127", "227"] },
  // Route 227 — unique section: Twyford → Shurlock Row → Waltham St Lawrence → Hare Hatch
  { id: "035099850002", name: "Twyford Station", lat: 51.475777, lon: -0.863517, routes: ["227"] },
  { id: "036006001105", name: "The Bell", lat: 51.485241, lon: -0.806854, routes: ["227"] },
  { id: "036006001108", name: "Shurlock Row White Hart", lat: 51.461594, lon: -0.802648, routes: ["227"] },
  { id: "036006001109", name: "Hill Farm", lat: 51.468267, lon: -0.803654, routes: ["227"] },
  { id: "036006002108", name: "Shurlock Row", lat: 51.460863, lon: -0.802423, routes: ["227"] },
  { id: "036006002109", name: "Hill Farm", lat: 51.468193, lon: -0.803440, routes: ["227"] },
  { id: "036006605605", name: "Royal Oak PH", lat: 51.464195, lon: -0.802883, routes: ["227"] },
  { id: "036006605606", name: "Royal Oak PH", lat: 51.464773, lon: -0.803170, routes: ["227"] },
  { id: "036006741741", name: "Downfield Road", lat: 51.475630, lon: -0.802627, routes: ["227"] },
  { id: "036006741742", name: "Downfield Road", lat: 51.475987, lon: -0.802883, routes: ["227"] },
  { id: "036006831831", name: "The Street", lat: 51.482413, lon: -0.805560, routes: ["227"] },
  { id: "036006831832", name: "The Street", lat: 51.482437, lon: -0.805285, routes: ["227"] },
  { id: "035090600001", name: "Carliles Corner", lat: 51.487647, lon: -0.870783, routes: ["850"] },
  { id: "035090660001", name: "The Greyhound", lat: 51.501116, lon: -0.869888, routes: ["850"] },
  { id: "035090700001", name: "Willow Lane", lat: 51.507426, lon: -0.868681, routes: ["850"] },
  { id: "035090720001", name: "Summer Lodge", lat: 51.511187, lon: -0.868433, routes: ["850"] },
  { id: "035090740001", name: "White Cliff", lat: 51.515395, lon: -0.869656, routes: ["850"] },
  { id: "035090760001", name: "Kentons Lane", lat: 51.518997, lon: -0.872370, routes: ["850"] },
  { id: "035090780001", name: "Temple Combe", lat: 51.523836, lon: -0.877579, routes: ["850"] },
  { id: "035090800001", name: "Marsh Mills", lat: 51.531317, lon: -0.888729, routes: ["850"] },
  { id: "035090820001", name: "Two Brewers", lat: 51.536269, lon: -0.896716, routes: ["850"] },
  { id: "035091020001", name: "Park View Drive South", lat: 51.476116, lon: -0.885496, routes: ["127", "128", "850"] },
  { id: "035091020002", name: "Park View Drive South", lat: 51.476300, lon: -0.885031, routes: ["12"] },
  { id: "035091040001", name: "Chiltern Drive", lat: 51.477706, lon: -0.882563, routes: ["127", "128", "850"] },
  { id: "035091040002", name: "Chiltern Drive", lat: 51.477315, lon: -0.883005, routes: ["12"] },
  { id: "035091060001", name: "Waggon and Horses", lat: 51.478222, lon: -0.872320, routes: ["127", "128", "850"] },
  { id: "035091060002", name: "Waggon and Horses", lat: 51.478177, lon: -0.873784, routes: ["12"] },
  { id: "035091100001", name: "Waitrose", lat: 51.478046, lon: -0.865476, routes: ["127", "850"] },
  { id: "035091100002", name: "Cross Roads", lat: 51.477352, lon: -0.867150, routes: ["12"] },
  { id: "035091100003", name: "Waitrose", lat: 51.477893, lon: -0.865451, routes: ["12", "129"] },
  { id: "035091100004", name: "Church Street", lat: 51.477000, lon: -0.865157, routes: ["128", "129", "227"] },
  { id: "035091120001", name: "Twyford Station", lat: 51.475519, lon: -0.861709, routes: ["128", "129"] },
  { id: "035091200001", name: "Springfield Park", lat: 51.479081, lon: -0.863694, routes: ["127", "850"] },
  { id: "035091200002", name: "Springfield Park", lat: 51.478893, lon: -0.863771, routes: ["12", "129"] },
  { id: "035091220001", name: "Orchard Estate", lat: 51.480111, lon: -0.861422, routes: ["127"] },
  { id: "035091240001", name: "Royal Oak", lat: 51.480230, lon: -0.857041, routes: ["127"] },
  { id: "035091260001", name: "Northbury Farm Bridleway", lat: 51.485589, lon: -0.855179, routes: ["127"] },
  { id: "035091280001", name: "Twyford Orchards Caravan Park", lat: 51.489485, lon: -0.853612, routes: ["127"] },
  { id: "035091300001", name: "Loddon Hall Road", lat: 51.481846, lon: -0.861436, routes: ["850"] },
  { id: "035091300002", name: "Loddon Hall Road", lat: 51.481523, lon: -0.861502, routes: ["12", "129"] },
  { id: "035091400001", name: "Pennfields", lat: 51.483471, lon: -0.860186, routes: ["850"] },
  { id: "035091400002", name: "Pennfields", lat: 51.483442, lon: -0.859985, routes: ["12", "129"] },
  { id: "035091420001", name: "Longfield Road", lat: 51.485229, lon: -0.862533, routes: ["850"] },
  { id: "035091420002", name: "Longfield Road", lat: 51.485228, lon: -0.862403, routes: ["12", "129"] },
  { id: "035091440001", name: "Arnside Close", lat: 51.485943, lon: -0.864820, routes: ["850"] },
  { id: "035091440002", name: "Arnside Close", lat: 51.486345, lon: -0.863585, routes: ["12", "129"] },
  { id: "035091460001", name: "Carlile Gardens", lat: 51.485580, lon: -0.869034, routes: ["850"] },
  { id: "035091460002", name: "Carlile Gardens", lat: 51.485666, lon: -0.868672, routes: ["12", "129"] },
  { id: "035091500001", name: "Ruscombe Turn", lat: 51.473183, lon: -0.856339, routes: ["128", "129"] },
  { id: "035091520001", name: "Colleton Drive", lat: 51.473393, lon: -0.859458, routes: ["128", "129"] },
  { id: "035091540001", name: "Winchcombe Road Foot", lat: 51.472391, lon: -0.861873, routes: ["128", "129"] },
  { id: "035091620001", name: "Burton Close", lat: 51.467448, lon: -0.856554, routes: ["128", "129"] },
  { id: "035091880001", name: "Dinton Pastures", lat: 51.439523, lon: -0.870014, routes: ["128", "129"] },
  { id: "035092280001", name: "Broad Hinton - Bolwell Close", lat: 51.472491, lon: -0.854628, routes: ["128", "129"] },
  { id: "035092300001", name: "Broad Hinton Fields", lat: 51.470753, lon: -0.853376, routes: ["128", "129"] },
  { id: "035092360001", name: "Elephant and Castle", lat: 51.461751, lon: -0.859734, routes: ["128", "129"] },
  { id: "035092380001", name: "Wards Cross", lat: 51.459130, lon: -0.853783, routes: ["128", "129"] },
  { id: "035092400001", name: "Primary School", lat: 51.455551, lon: -0.853714, routes: ["128", "129"] },
  { id: "035092420001", name: "School Road South", lat: 51.453741, lon: -0.856235, routes: ["128", "129"] },
  { id: "035092440001", name: "Sawpit Road", lat: 51.453414, lon: -0.859611, routes: ["128", "129"] },
  { id: "035092500001", name: "Jolly Farmer", lat: 51.445317, lon: -0.865597, routes: ["128", "129"] },
  { id: "035092520001", name: "Davis Street", lat: 51.443022, lon: -0.867280, routes: ["128", "129"] },
  { id: "035092560001", name: "Bluebell Meadow", lat: 51.433976, lon: -0.873398, routes: ["128", "129"] },
  { id: "035092580001", name: "Robinhood Lane", lat: 51.432174, lon: -0.875259, routes: ["128", "129"] },
  { id: "035096020001", name: "Mumbery Hill", lat: 51.494709, lon: -0.853553, routes: ["127"] },
  { id: "035096040001", name: "Mumbery Hill - School Hill", lat: 51.496176, lon: -0.860186, routes: ["127"] },
  { id: "035096060001", name: "School Hill", lat: 51.498660, lon: -0.864072, routes: ["127"] },
  { id: "035096080001", name: "Hamilton Road", lat: 51.501193, lon: -0.862006, routes: ["127"] },
  { id: "035096100001", name: "East View Road", lat: 51.503085, lon: -0.856787, routes: ["127"] },
  { id: "035096120001", name: "Blakes Road - Highfield Park", lat: 51.503603, lon: -0.853661, routes: ["127"] },
  { id: "035096160001", name: "Blakes Road", lat: 51.502667, lon: -0.849867, routes: ["127"] },
  { id: "035096180001", name: "Tag Lane", lat: 51.502002, lon: -0.845345, routes: ["127"] },
  { id: "035096200001", name: "Tag Lane", lat: 51.499778, lon: -0.844148, routes: ["127"] },
  { id: "035096220001", name: "Tag Lane Foot", lat: 51.496402, lon: -0.844666, routes: ["127"] },
  { id: "036000000001", name: "Highway Marlborough Road", lat: 51.520387, lon: -0.754894, routes: ["127", "227"] },
  { id: "036000000003", name: "Pinkneys Green Newlands Girls School", lat: 51.523504, lon: -0.756243, routes: ["127", "227"] },
  { id: "036000000006", name: "High Town Valley Walk", lat: 51.520160, lon: -0.727896, routes: ["127"] },
  { id: "036000000366", name: "Boyn Hill Grenfell Road", lat: 51.521564, lon: -0.731166, routes: ["127"] },
  { id: "036006001043", name: "St Marks Hospital Gate 1", lat: 51.524801, lon: -0.745971, routes: ["127", "227"] },
  { id: "036006001045", name: "Farm Road Shops", lat: 51.524294, lon: -0.754057, routes: ["127", "227"] },
  { id: "036006001053", name: "Belmont Raymond Road", lat: 51.522970, lon: -0.736176, routes: ["127", "227"] },
  { id: "036006001055", name: "All Saints Avenue", lat: 51.521262, lon: -0.738789, routes: ["127", "227"] },
  { id: "036006001059", name: "Highway Newlands Drive", lat: 51.519348, lon: -0.759957, routes: ["127", "227"] },
  { id: "036006001074", name: "Shire Horse PH", lat: 51.516276, lon: -0.776542, routes: ["127", "227"] },
  { id: "036006001450", name: "Boyn Hill Castle Hill", lat: 51.522517, lon: -0.732525, routes: ["127"] },
  { id: "036006002166", name: "Queen Street", lat: 51.520107, lon: -0.720992, routes: ["127", "227"] },
  { id: "036006003004", name: "Maidenhead Rail Station", lat: 51.519009, lon: -0.721653, routes: ["127", "227"] },
  { id: "036006005005", name: "Library", lat: 51.522486, lon: -0.718143, routes: ["127", "227"] },
  { id: "036006006006", name: "Bridge Avenue", lat: 51.522184, lon: -0.716336, routes: ["127", "227"] },
  { id: "036006007007", name: "Market Street", lat: 51.522875, lon: -0.719963, routes: ["127", "227"] },
  { id: "036006008008", name: "Broadway", lat: 51.521415, lon: -0.720649, routes: ["127", "227"] },
  { id: "036006009010", name: "Frascati Way", lat: 51.521166, lon: -0.723812, routes: ["127", "227"] },
  { id: "036006068068", name: "St Marks Hospital", lat: 51.524119, lon: -0.743596, routes: ["127", "227"] },
  { id: "036006150151", name: "Thicket Corner", lat: 51.518032, lon: -0.768208, routes: ["127", "227"] },
  { id: "036006154155", name: "Littlewick Green Westacott Way", lat: 51.515630, lon: -0.784443, routes: ["127", "227"] },
  { id: "036006156156", name: "Littlewick Green Green Lane", lat: 51.515326, lon: -0.791642, routes: ["127", "227"] },
  { id: "036006161161", name: "Square Deal Cafe", lat: 51.508223, lon: -0.815447, routes: ["127", "227"] },
  { id: "036006723723", name: "Bottle Lane", lat: 51.513210, lon: -0.808919, routes: ["127", "227"] },
  { id: "036006723725", name: "Frogmore Farm", lat: 51.514713, lon: -0.804571, routes: ["127", "227"] },
  { id: "036006737737", name: "Grenfell Park", lat: 51.519206, lon: -0.724087, routes: ["127", "227"] },
  { id: "036006818819", name: "St Marks Crescent", lat: 51.525394, lon: -0.748448, routes: ["127", "227"] },
  { id: "039025480001", name: "Cemetery Junction", lat: 51.453996, lon: -0.946557, routes: ["12"] },
  { id: "039025480003", name: "Cemetery Junction", lat: 51.453092, lon: -0.949865, routes: ["127", "128", "129", "850"] },
  { id: "039025550001", name: "Cholmeley Road", lat: 51.453686, lon: -0.946564, routes: ["127", "128", "129", "850"] },
  { id: "039025550002", name: "Cholmeley Road", lat: 51.455020, lon: -0.942648, routes: ["12"] },
  { id: "039025920003", name: "Kings Road", lat: 51.454986, lon: -0.968422, routes: ["127", "128", "129"] },
  { id: "039025980001", name: "Eldon Road", lat: 51.456535, lon: -0.962028, routes: ["12"] },
  { id: "039025980002", name: "Eldon Road", lat: 51.453808, lon: -0.957235, routes: ["127", "128", "129", "850"] },
  { id: "039026050006", name: "Huntley and Palmers", lat: 51.455608, lon: -0.957575, routes: ["12"] },
  { id: "039026410005", name: "Huntley and Palmers", lat: 51.455032, lon: -0.961377, routes: ["127", "128", "129", "850"] },
  { id: "039026570001", name: "Liverpool Road", lat: 51.454995, lon: -0.940728, routes: ["127", "128", "129", "850"] },
  { id: "039026570002", name: "Liverpool Road", lat: 51.454952, lon: -0.937935, routes: ["12"] },
  { id: "039027450001", name: "Reading College", lat: 51.454628, lon: -0.950510, routes: ["12"] },
  { id: "039027450002", name: "Reading College", lat: 51.453471, lon: -0.953578, routes: ["127", "128", "129", "850"] },
  { id: "039028150002", name: "Blagrave Street", lat: 51.457712, lon: -0.970395, routes: ["127", "128", "129", "850"] },
  { id: "039028170001", name: "Friar Street", lat: 51.456643, lon: -0.970960, routes: ["12", "127", "128", "129", "850"] },
  { id: "040000002959", name: "High Wycombe Bus Station", lat: 51.631313, lon: -0.756502, routes: ["850"] },
  { id: "040000003394", name: "Marlow Road", lat: 51.616033, lon: -0.768099, routes: ["850"] },
  { id: "040000003396", name: "Rupert Avenue", lat: 51.617801, lon: -0.766968, routes: ["850"] },
  { id: "040000003408", name: "Carver Hill Road", lat: 51.623214, lon: -0.766055, routes: ["850"] },
  { id: "040000003410", name: "The Wendover Arms", lat: 51.626853, lon: -0.764945, routes: ["850"] },
  { id: "040000003412", name: "Plumer Road", lat: 51.629046, lon: -0.764048, routes: ["850"] },
  { id: "040000003336", name: "St John's Church", lat: 51.631432, lon: -0.760576, routes: ["850"] },
  { id: "040000003414", name: "West End Road", lat: 51.631550, lon: -0.762679, routes: ["850"] },
  { id: "040000003734", name: "The Blacksmiths' Arms", lat: 51.608813, lon: -0.771100, routes: ["850"] },
  { id: "040000003736", name: "Burroughs Grove Hill", lat: 51.600738, lon: -0.769870, routes: ["850"] },
  { id: "040000003738", name: "The Three Horseshoes PH", lat: 51.594585, lon: -0.766504, routes: ["850"] },
  { id: "040000003740", name: "Wycombe Road", lat: 51.585367, lon: -0.766647, routes: ["850"] },
  { id: "040000003742", name: "Churchill Drive", lat: 51.583778, lon: -0.762014, routes: ["850"] },
  { id: "040000003744", name: "Wiltshire Road", lat: 51.581441, lon: -0.761255, routes: ["850"] },
  { id: "040000003748", name: "Bobmore Lane", lat: 51.578550, lon: -0.767017, routes: ["850"] },
  { id: "040000003750", name: "Foxes Piece", lat: 51.575720, lon: -0.771310, routes: ["850"] },
  { id: "040000003759", name: "The Three Horseshoes PH", lat: 51.593862, lon: -0.766363, routes: ["850"] },
  { id: "040000003761", name: "Wycombe Road", lat: 51.585300, lon: -0.766250, routes: ["850"] },
  { id: "040000003767", name: "Bobmore Lane", lat: 51.578677, lon: -0.765778, routes: ["850"] },
  { id: "040000003752", name: "Spittal Street", lat: 51.573874, lon: -0.774506, routes: ["850"] },
  { id: "040000003764", name: "Dean Street Car Park", lat: 51.573847, lon: -0.777017, routes: ["850"] },
  { id: "040000003766", name: "Dean Street", lat: 51.575034, lon: -0.778775, routes: ["850"] },
  { id: "040000003768", name: "Queens Road", lat: 51.574947, lon: -0.780754, routes: ["850"] },
  { id: "040000003770", name: "West Street", lat: 51.570964, lon: -0.779100, routes: ["850"] },
  { id: "040000003772", name: "Spinfield Lane", lat: 51.569222, lon: -0.784572, routes: ["850"] },
  { id: "040000003774", name: "Pound Lane", lat: 51.565551, lon: -0.790441, routes: ["850"] },
  { id: "040000003776", name: "Hooks Corner", lat: 51.564116, lon: -0.801285, routes: ["850"] },
  { id: "040000003778", name: "Harleyford Manor", lat: 51.560946, lon: -0.810486, routes: ["850"] },
  { id: "040000003780", name: "Combined School", lat: 51.558222, lon: -0.815909, routes: ["850"] },
  { id: "040000003782", name: "Thames Reach", lat: 51.557278, lon: -0.820376, routes: ["850"] },
  { id: "040000003784", name: "Danesfield House", lat: 51.554474, lon: -0.826810, routes: ["850"] },
  { id: "040000003786", name: "Millbank Wood", lat: 51.552613, lon: -0.829583, routes: ["850"] },
  { id: "040000003788", name: "The Dog and Badger", lat: 51.553504, lon: -0.839571, routes: ["850"] },
  { id: "040000003790", name: "Mill End", lat: 51.558708, lon: -0.867856, routes: ["850"] },
  { id: "040000003794", name: "Benhams Lane", lat: 51.562051, lon: -0.894044, routes: ["850"] },
  { id: "040000003888", name: "Westfield Bungalows", lat: 51.555536, lon: -0.849602, routes: ["850"] },
  { id: "040000003956", name: "Fawley Court Farm", lat: 51.561025, lon: -0.897776, routes: ["850"] },
  { id: "340000393BEL", name: "Bell Street", lat: 51.537757, lon: -0.904826, routes: ["850"] },
  { id: "340001512OPP", name: "Bell Street North", lat: 51.540552, lon: -0.904644, routes: ["850"] },
  { id: "340001663NOR", name: "Swiss Farm", lat: 51.545613, lon: -0.903600, routes: ["850"] },
  { id: "340024004NOR", name: "Icehouse Lane", lat: 51.547500, lon: -0.905000, routes: ["850"] },
];

// Only show buses on these routes
const TARGET_ROUTES = new Set(["850", "12", "127", "128", "129", "227"]);

// Known route metadata (operators verified against BODS data)
const ROUTES_INFO = {
  "128": { lineName: "128", operator: "Thames Valley Buses", origin: "Reading Station", destination: "Wokingham Station", color: "#2563eb" },
  "129": { lineName: "129", operator: "Thames Valley Buses", origin: "Reading Station", destination: "Wokingham Station", color: "#3b82f6" },
  "127": { lineName: "127", operator: "Carousel Buses", origin: "Reading Station", destination: "Maidenhead", color: "#10b981" },
  "850": { lineName: "850", operator: "Carousel Buses", origin: "Reading Station", destination: "High Wycombe", color: "#d97706" },
  "12":  { lineName: "12",  operator: "Reading Buses", origin: "Reading Station", destination: "Twyford Hub", color: "#8b5cf6" },
  "227": { lineName: "227", operator: "Thames Valley Buses", origin: "Twyford", destination: "Maidenhead", color: "#0d9488" }
};

// Approximate bearings for Carousel routes (they provide directionRef but not bearing)
const ROUTE_DIRECTION_BEARINGS = {
  "127": { outbound: 70, inbound: 250 },   // Reading <-> Maidenhead (ENE/WSW)
  "850": { outbound: 340, inbound: 160 },   // Reading <-> High Wycombe (NNW/SSE)
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
  "CTNY": "Thames Valley Buses",
  "CORT": "Thames Valley Buses"
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

      const lineRef = journey.LineRef || "?";

      // Only include buses on target routes
      if (!TARGET_ROUTES.has(lineRef)) return null;
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
      const rawBearing = parseFloat(journey.Bearing) || null;
      // Derive bearing from directionRef for operators that don't provide it
      let bearing = rawBearing;
      if (!bearing && directionRef && ROUTE_DIRECTION_BEARINGS[lineRef]) {
        const dir = directionRef.toLowerCase();
        if (dir === 'inbound' || dir === 'outbound') {
          bearing = ROUTE_DIRECTION_BEARINGS[lineRef][dir];
        }
      }
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
  res.json(ROUTE_STOPS);
});

// Live arrivals at a specific stop (BODS only)
app.get('/api/stops/:id/arrivals', async (req, res) => {
  const stopId = req.params.id;
  const stop = ROUTE_STOPS.find(s => s.id === stopId);

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
    const stopsServed = ROUTE_STOPS
      .filter(s => s.routes.includes(key))
      .map(s => ({ id: s.id, name: s.name }));
    enriched[key] = { ...route, color: getRouteColor(key), stopsServed };
  }
  res.json(enriched);
});

app.listen(PORT, () => {
  console.log(`Twyford Transport Live Server running at http://localhost:${PORT}`);
});
