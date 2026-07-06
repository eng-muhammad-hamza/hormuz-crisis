/**
 * Routing Engine - Grid-based A* pathfinding in navigable waters
 */

const FLEET_DATA = require('../data/fleet');

// Grid resolution for pathfinding
const GRID_LAT_STEPS = 80;
const GRID_LNG_STEPS = 100;

const BOUNDS = FLEET_DATA.boundingBox;
const NAV_POLY = FLEET_DATA.navigableWater;

function latToGridY(lat) {
  return Math.round(((lat - BOUNDS.south) / (BOUNDS.north - BOUNDS.south)) * (GRID_LAT_STEPS - 1));
}
function lngToGridX(lng) {
  return Math.round(((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * (GRID_LNG_STEPS - 1));
}
function gridYToLat(y) {
  return BOUNDS.south + (y / (GRID_LAT_STEPS - 1)) * (BOUNDS.north - BOUNDS.south);
}
function gridXToLng(x) {
  return BOUNDS.west + (x / (GRID_LNG_STEPS - 1)) * (BOUNDS.east - BOUNDS.west);
}

// Point-in-polygon test (ray casting)
function pointInPolygon(lat, lng, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Precompute navigable grid
let _navGrid = null;
function getNavGrid() {
  if (_navGrid) return _navGrid;
  _navGrid = Array.from({ length: GRID_LAT_STEPS }, (_, y) =>
    Array.from({ length: GRID_LNG_STEPS }, (_, x) => {
      const lat = gridYToLat(y);
      const lng = gridXToLng(x);
      return pointInPolygon(lat, lng, NAV_POLY);
    })
  );
  return _navGrid;
}

function isNavigable(y, x, restrictedZones = []) {
  if (y < 0 || y >= GRID_LAT_STEPS || x < 0 || x >= GRID_LNG_STEPS) return false;
  const grid = getNavGrid();
  if (!grid[y][x]) return false;
  // Check restricted zones
  const lat = gridYToLat(y);
  const lng = gridXToLng(x);
  for (const zone of restrictedZones) {
    if (zone.active && pointInPolygon(lat, lng, zone.polygon)) return false;
  }
  return true;
}

function findNearestNavigable(y, x, restrictedZones = []) {
  if (isNavigable(y, x, restrictedZones)) return { y, x };
  // Search in expanding radius
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dy) !== r && Math.abs(dx) !== r) continue; // only boundary
        if (isNavigable(y + dy, x + dx, restrictedZones)) return { y: y + dy, x: x + dx };
      }
    }
  }
  return null;
}

function heuristic(y1, x1, y2, x2) {
  return Math.sqrt((y1 - y2) ** 2 + (x1 - x2) ** 2);
}

/**
 * A* pathfinding on grid
 */
function astar(startLat, startLng, endLat, endLng, restrictedZones = []) {
  const sy = latToGridY(startLat);
  const sx = lngToGridX(startLng);
  let ey = latToGridY(endLat);
  let ex = lngToGridX(endLng);

  // Find nearest navigable cell for both start and end
  const navStart = findNearestNavigable(sy, sx, []);
  const navEnd   = findNearestNavigable(ey, ex, []);

  if (!navStart || !navEnd) {
    return null; // truly unreachable
  }

  const startY = navStart.y, startX = navStart.x;
  ey = navEnd.y; ex = navEnd.x;

  const openSet = new Map();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const key = (y, x) => `${y},${x}`;
  gScore.set(key(startY, startX), 0);
  fScore.set(key(startY, startX), heuristic(startY, startX, ey, ex));
  openSet.set(key(startY, startX), { y: startY, x: startX });

  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  let iterations = 0;
  const MAX_ITER = 15000;

  while (openSet.size > 0 && iterations < MAX_ITER) {
    iterations++;
    // Find node with lowest fScore
    let current = null;
    let lowestF = Infinity;
    for (const [k, node] of openSet) {
      const f = fScore.get(k) ?? Infinity;
      if (f < lowestF) { lowestF = f; current = { k, ...node }; }
    }
    if (!current) break;

    if (current.y === ey && current.x === ex) {
      // Reconstruct path
      const path = [];
      let cur = key(ey, ex);
      while (cameFrom.has(cur)) {
        const [cy, cx] = cur.split(',').map(Number);
        path.unshift([gridYToLat(cy), gridXToLng(cx)]);
        cur = cameFrom.get(cur);
      }
      path.unshift([startLat, startLng]);
      path.push([endLat, endLng]);
      return simplifyPath(path);
    }

    openSet.delete(current.k);

    for (const [dy, dx] of directions) {
      const ny = current.y + dy;
      const nx = current.x + dx;
      const nk = key(ny, nx);
      if (!isNavigable(ny, nx, restrictedZones)) continue;
      const moveCost = dy !== 0 && dx !== 0 ? 1.414 : 1;
      const tentativeG = (gScore.get(current.k) ?? Infinity) + moveCost;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current.k);
        gScore.set(nk, tentativeG);
        fScore.set(nk, tentativeG + heuristic(ny, nx, ey, ex));
        openSet.set(nk, { y: ny, x: nx });
      }
    }
  }
  return null; // No path found
}

/**
 * Douglas-Peucker line simplification
 */
function simplifyPath(points, tolerance = 0.05) {
  if (points.length <= 2) return points;
  
  function perpendicularDistance(p, start, end) {
    const [lat, lng] = p;
    const [sLat, sLng] = start;
    const [eLat, eLng] = end;
    const dx = eLat - sLat;
    const dy = eLng - sLng;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return Math.sqrt((lat - sLat) ** 2 + (lng - sLng) ** 2);
    return Math.abs(dx * (sLng - lng) - dy * (sLat - lat)) / mag;
  }

  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

/**
 * Calculate bearing between two lat/lng points
 */
function calculateBearing(lat1, lng1, lat2, lng2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Haversine distance in km
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Estimate fuel needed for path
 */
function estimateFuelForPath(path, speed, fuelBurnRate = 1.2) {
  let totalKm = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalKm += haversineDistance(path[i][0], path[i][1], path[i+1][0], path[i+1][1]);
  }
  const hours = totalKm / (speed * 1.852); // knots to km/h
  return hours * fuelBurnRate * speed * 0.1;
}

module.exports = { astar, calculateBearing, haversineDistance, estimateFuelForPath, pointInPolygon };
