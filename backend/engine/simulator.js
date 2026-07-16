/**
 * Ship Simulator - 1Hz tick engine
 */

const { v4: uuidv4 } = require('uuid');
const FLEET_DATA = require('../data/fleet');
const { astar, calculateBearing, haversineDistance, estimateFuelForPath, pointInPolygon } = require('./router');

const KNOTS_TO_KM_PER_S = 1.852 / 3600; // 1 knot = 1.852 km/h = km/s
// Fuel burn model: tons consumed per nautical mile, scaled cubically with speed
// (real ship fuel consumption roughly scales with speed^3 due to hull drag).
// Tuned so a mid-size tanker at ~14kn burns its ~6-8kt bunker over several days,
// matching the ETA values already shown in the UI, while still being visibly
// progressive within a single short demo session (a few % per real-time hour).
const FUEL_BURN_REFERENCE_SPEED = 14; // knots
const FUEL_BURN_REFERENCE_RATE  = 0.85; // tons per nautical mile at reference speed
const WEATHER_FUEL_MULTIPLIER = 1.3;
const PROXIMITY_WARN_KM = 2;
const MAX_HISTORY_SNAPSHOTS = 120; // 1 hour at 30s intervals

class ShipSimulator {
  constructor() {
    this.ships = new Map();
    this.ports = new Map();
    this.restrictedZones = new Map();
    this.alerts = new Map();
    this.directives = [];
    this.distressMessages = [];
    this.history = []; // snapshots
    this.lastHistorySnapshot = 0;
    this.tickCount = 0;
    this.weatherZones = []; // simulated weather patches
    this.eventLog = [];
    this.listeners = [];
    this.operators = new Map(); // sessionId -> { name, role, shipId }
    this.assistanceRequests = [];
    this.simTimeMultiplier = 90; // simulated seconds advanced per real-world tick

    this._init();
  }

  setSimTimeMultiplier(value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return this.simTimeMultiplier;
    this.simTimeMultiplier = Math.min(v, 3600); // cap at 1 simulated hour per tick
    this.logEvent('SYSTEM', 'SIM_SPEED', `Simulation speed set to ${this.simTimeMultiplier}x (${this.simTimeMultiplier}s simulated per real second)`, 'info');
    return this.simTimeMultiplier;
  }

  _init() {
    // Load ports
    for (const port of FLEET_DATA.ports) {
      this.ports.set(port.id, { ...port });
    }

    // Load fleet
    const CAPTAIN_NAMES = [
      'Cdr. Hale', 'Capt. Reyes', 'Capt. Okafor', 'Capt. Lindqvist', 'Capt. Demir',
      'Capt. Suleiman', 'Capt. Park', 'Capt. Mwangi', 'Capt. Novak', 'Capt. Alvi',
      'Capt. Fontaine', 'Capt. Ibarra', 'Capt. Khoury', 'Capt. Santos', 'Capt. Brennan',
    ];
    FLEET_DATA.fleet.forEach((ship, i) => {
      const port = this.ports.get(ship.destination);
      this.ships.set(ship.shipId, {
        ...ship,
        position: [...ship.position],
        prevPosition: [...ship.position],
        path: [],
        pathIndex: 0,
        distanceToDestination: port ? haversineDistance(ship.position[0], ship.position[1], port.position[0], port.position[1]) : 0,
        fuelCapacity: ship.fuel,
        arrived: false,
        distressMessages: [],
        assignedCaptain: null,
        defaultCaptainName: CAPTAIN_NAMES[i % CAPTAIN_NAMES.length],
        crewCount: 14 + (i % 9),
        operatorSessionId: null,
        inWeather: false,
        predictedFuelShortfall: false,
        eta: null,
        totalDistanceTraveled: 0,
        speedHistory: [],
        holdUntil: null,
        inspectionRequested: false,
      });
    });

    // Generate simulated weather zones
    this._generateWeatherZones();

    // Compute initial paths
    for (const [shipId] of this.ships) {
      this._computePath(shipId);
    }

    this.logEvent('SYSTEM', 'SYSTEM', 'Fleet initialized. 15 vessels active in Strait of Hormuz operational area.', 'info');
  }

  // ── Operator identity ──
  registerOperator(sessionId, { name, role, shipId }) {
    this.operators.set(sessionId, { name, role, shipId, connectedAt: new Date().toISOString() });
    if (role === 'captain' && shipId) {
      const ship = this.ships.get(shipId);
      if (ship) {
        ship.assignedCaptain = name || ship.defaultCaptainName;
        ship.operatorSessionId = sessionId;
      }
    }
    return this.operators.get(sessionId);
  }

  unregisterOperator(sessionId) {
    const op = this.operators.get(sessionId);
    if (op?.role === 'captain' && op.shipId) {
      const ship = this.ships.get(op.shipId);
      if (ship && ship.operatorSessionId === sessionId) {
        ship.operatorSessionId = null;
        // Keep assignedCaptain as the name for record, ship reverts to "unmanned by live operator" but defaultCaptainName remains
      }
    }
    this.operators.delete(sessionId);
  }

  getActiveOperators() {
    return Array.from(this.operators.values());
  }

  _generateWeatherZones() {
    this.weatherZones = [
      {
        id: 'WZ-1',
        name: 'Gulf Squall Alpha',
        center: [25.8, 55.5],
        radius: 1.2, // degrees
        intensity: 'moderate',
        windSpeed: 35,
        visibility: 2,
      },
      {
        id: 'WZ-2',
        name: 'Persian Dust Storm',
        center: [27.5, 52.0],
        radius: 0.8,
        intensity: 'severe',
        windSpeed: 55,
        visibility: 0.5,
      },
      {
        id: 'WZ-3',
        name: 'Oman Sea Chop',
        center: [23.5, 59.0],
        radius: 1.0,
        intensity: 'light',
        windSpeed: 22,
        visibility: 5,
      },
    ];
  }

  isInWeather(lat, lng) {
    for (const wz of this.weatherZones) {
      const dist = haversineDistance(lat, lng, wz.center[0], wz.center[1]);
      const radiusKm = wz.radius * 111;
      if (dist < radiusKm) return wz;
    }
    return null;
  }

  _computePath(shipId) {
    const ship = this.ships.get(shipId);
    if (!ship || ship.arrived) return;

    const port = this.ports.get(ship.destination);
    if (!port) return;

    const zones = Array.from(this.restrictedZones.values());

    // If a custom waypoint diversion is active, route there first, then the
    // next path computation (once the ship arrives near it) will resume to port.
    const target = ship.customWaypoint && haversineDistance(ship.position[0], ship.position[1], ship.customWaypoint[0], ship.customWaypoint[1]) > 5
      ? ship.customWaypoint
      : port.position;

    if (ship.customWaypoint && target === port.position) {
      // Reached the waypoint vicinity — clear it so we resume normal port routing
      ship.customWaypoint = null;
    }

    const path = astar(
      ship.position[0], ship.position[1],
      target[0], target[1],
      zones
    );

    if (!path) {
      ship.status = 'stranded';
      this._fireAlert(shipId, 'STRANDED', `${ship.name} is stranded - no navigable path to ${port.name}`, 'critical');
      return;
    }

    ship.path = path;
    ship.pathIndex = 1; // next waypoint

    // Estimate ETA and fuel
    const fuelNeeded = estimateFuelForPath(path, ship.speed);
    ship.predictedFuelShortfall = fuelNeeded > ship.fuel;
    
    const totalKm = path.reduce((sum, p, i) => {
      if (i === 0) return 0;
      return sum + haversineDistance(path[i-1][0], path[i-1][1], p[0], p[1]);
    }, 0);
    const etaHours = totalKm / (ship.speed * 1.852);
    ship.eta = new Date(Date.now() + etaHours * 3600 * 1000).toISOString();
    ship.distanceToDestination = totalKm;

    if (ship.predictedFuelShortfall && !ship.customWaypoint) {
      ship.status = 'insufficient_fuel';
      this._fireAlert(shipId, 'FUEL_LOW', `${ship.name} may not have enough fuel to reach ${port.name} (needs ~${Math.round(fuelNeeded)}t, has ${Math.round(ship.fuel)}t)`, 'warning');
    }
  }

  tick() {
    this.tickCount++;
    const now = Date.now();
    // SIM_TIME_MULTIPLIER: each real-world 1Hz tick advances the simulated
    // clock by this many simulated seconds. Every rate in this engine (fuel
    // burn, distance, weather) is derived from `dt`, so multiplying it keeps
    // physics internally consistent while making the whole fleet's movement,
    // fuel draw-down, and ETAs fast enough to observe within a normal testing
    // session instead of requiring multi-hour real-time waits.
    const dt = this.simTimeMultiplier || 90; // 90 simulated seconds per real tick (~1.5 min/sec)

    // Advance each ship
    for (const [shipId, ship] of this.ships) {
      if (ship.arrived || ship.status === 'stopped' || ship.status === 'stranded') continue;
      
      ship.prevPosition = [...ship.position];

      // Check weather
      const weather = this.isInWeather(ship.position[0], ship.position[1]);
      ship.inWeather = !!weather;
      ship.currentWeather = weather || null;

      // Fuel burn
      const speedKms = ship.speed * KNOTS_TO_KM_PER_S;
      const distanceMoved = speedKms * dt;
      // Fuel burn — scales with speed^3 (drag), normalized against a reference
      // speed/rate so different ships burn proportionally more when ordered faster.
      const speedRatio = ship.speed / FUEL_BURN_REFERENCE_SPEED;
      const burnRatePerNm = FUEL_BURN_REFERENCE_RATE * Math.pow(Math.max(speedRatio, 0.15), 3);
      const distanceMovedNm = distanceMoved / 1.852; // km -> nautical miles
      const fuelBurn = distanceMovedNm * burnRatePerNm * (ship.inWeather ? WEATHER_FUEL_MULTIPLIER : 1);
      ship.fuel = Math.max(0, ship.fuel - fuelBurn);
      ship.totalDistanceTraveled = (ship.totalDistanceTraveled || 0) + distanceMoved;

      // Out of fuel
      if (ship.fuel <= 0 && ship.status !== 'distressed') {
        ship.status = 'out_of_fuel';
        ship.speed = 0;
        this._fireAlert(shipId, 'OUT_OF_FUEL', `${ship.name} has run out of fuel at position [${ship.position[0].toFixed(3)}, ${ship.position[1].toFixed(3)}]`, 'critical');
        continue;
      }

      // Follow path
      if (ship.path && ship.path.length > 0 && ship.pathIndex < ship.path.length) {
        const target = ship.path[ship.pathIndex];
        const distToWaypoint = haversineDistance(ship.position[0], ship.position[1], target[0], target[1]);

        if (distToWaypoint < distanceMoved * 2 || distToWaypoint < 0.1) {
          ship.pathIndex++;
          if (ship.pathIndex >= ship.path.length) {
            if (ship.customWaypoint) {
              // Reached the diversion waypoint — clear it and recompute path to true destination
              ship.customWaypoint = null;
              ship.status = 'rerouting';
              this._computePath(shipId);
              this.logEvent(shipId, 'WAYPOINT_REACHED', `${ship.name} reached diversion waypoint, resuming course`, 'info');
              continue;
            }
            // True arrival at destination port
            ship.arrived = true;
            ship.status = 'arrived';
            ship.speed = 0;
            const port = this.ports.get(ship.destination);
            this.logEvent(shipId, 'ARRIVAL', `${ship.name} has arrived at ${port?.name || ship.destination}`, 'success');
            this._fireAlert(shipId, 'ARRIVED', `${ship.name} has docked at ${port?.name}`, 'info');
            continue;
          }
        }

        // Move toward waypoint
        const bearing = calculateBearing(ship.position[0], ship.position[1], target[0], target[1]);
        ship.heading = bearing;
        
        const latPerKm = 1 / 111;
        const lngPerKm = 1 / (111 * Math.cos((ship.position[0] * Math.PI) / 180));
        const bearingRad = (bearing * Math.PI) / 180;
        ship.position[0] += distanceMoved * Math.cos(bearingRad) * latPerKm;
        ship.position[1] += distanceMoved * Math.sin(bearingRad) * lngPerKm;

        // Update distance to destination
        const port = this.ports.get(ship.destination);
        if (port) {
          ship.distanceToDestination = haversineDistance(ship.position[0], ship.position[1], port.position[0], port.position[1]);
        }
      } else if (!ship.path || ship.path.length === 0) {
        // No path, compute one
        this._computePath(shipId);
      }

      // Check restricted zones
      for (const [zoneId, zone] of this.restrictedZones) {
        if (!zone.active) continue;
        if (pointInPolygon(ship.position[0], ship.position[1], zone.polygon)) {
          const alertKey = `${shipId}-ZONE-${zoneId}`;
          if (!this.alerts.has(alertKey)) {
            this._fireAlert(alertKey, 'GEOFENCE_BREACH', `${ship.name} has entered restricted zone "${zone.name}"`, 'critical', shipId, zoneId);
            ship.status = 'rerouting';
            this._computePath(shipId);
          }
        }
      }

      // Update status
      if (ship.status === 'rerouting' && ship.path && ship.path.length > 0) {
        ship.status = 'normal';
      }
    }

    // Proximity warnings
    this._checkProximity();

    // Predictive alerts
    if (this.tickCount % 30 === 0) {
      this._checkPredictiveAlerts();
    }

    // History snapshot every 30 seconds
    if (now - this.lastHistorySnapshot > 30000) {
      this._takeSnapshot();
      this.lastHistorySnapshot = now;
    }

    // Emit state
    this._emit('fleet_update', this.getState());
  }

  _checkProximity() {
    const ships = Array.from(this.ships.values()).filter(s => !s.arrived && s.status !== 'stopped');
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        const dist = haversineDistance(
          ships[i].position[0], ships[i].position[1],
          ships[j].position[0], ships[j].position[1]
        );
        if (dist < PROXIMITY_WARN_KM) {
          const alertKey = `PROX-${ships[i].shipId}-${ships[j].shipId}`;
          if (!this.alerts.has(alertKey)) {
            this._fireAlert(alertKey, 'PROXIMITY', 
              `Collision risk: ${ships[i].name} and ${ships[j].name} are ${(dist * 1000).toFixed(0)}m apart`,
              'critical', ships[i].shipId);
          }
        } else {
          // Clear old proximity alert
          const alertKey = `PROX-${ships[i].shipId}-${ships[j].shipId}`;
          if (this.alerts.has(alertKey)) {
            const alert = this.alerts.get(alertKey);
            if (!alert.acknowledged) {
              alert.resolved = true;
              this.alerts.delete(alertKey);
            }
          }
        }
      }
    }
  }

  _checkPredictiveAlerts() {
    for (const [shipId, ship] of this.ships) {
      if (ship.arrived || ship.status === 'stopped') continue;

      // Predict zone entry
      if (ship.path && ship.path.length > 0) {
        for (const [zoneId, zone] of this.restrictedZones) {
          if (!zone.active) continue;
          // Check next 3 waypoints
          for (let i = ship.pathIndex; i < Math.min(ship.pathIndex + 3, ship.path.length); i++) {
            if (pointInPolygon(ship.path[i][0], ship.path[i][1], zone.polygon)) {
              const alertKey = `PREDICT-${shipId}-${zoneId}`;
              if (!this.alerts.has(alertKey)) {
                this._fireAlert(alertKey, 'PREDICTIVE_ZONE', 
                  `${ship.name} is projected to enter restricted zone "${zone.name}" within ~3 minutes`,
                  'warning', shipId);
              }
              break;
            }
          }
        }
      }

      // Predict fuel shortfall
      if (ship.fuel < 500 && ship.distanceToDestination > 50) {
        const alertKey = `PREDICT-FUEL-${shipId}`;
        if (!this.alerts.has(alertKey)) {
          this._fireAlert(alertKey, 'PREDICTIVE_FUEL',
            `${ship.name} projected to run out of fuel ${Math.round(ship.distanceToDestination - 50)}km short of destination`,
            'warning', shipId);
        }
      }
    }
  }

  _fireAlert(id, type, message, severity, shipId = null, zoneId = null) {
    const alert = {
      id: typeof id === 'string' ? id : uuidv4(),
      type,
      message,
      severity,
      shipId,
      zoneId,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    this.alerts.set(alert.id, alert);
    this.logEvent(shipId || 'SYSTEM', type, message, severity);
    this._emit('alert', alert);
    return alert;
  }

  _takeSnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      ships: Array.from(this.ships.values()).map(s => ({
        shipId: s.shipId,
        position: [...s.position],
        status: s.status,
        fuel: s.fuel,
        heading: s.heading,
        speed: s.speed,
      })),
      alertCount: this.alerts.size,
    };
    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY_SNAPSHOTS) {
      this.history.shift();
    }
  }

  logEvent(entityId, type, message, severity = 'info') {
    const entry = {
      id: uuidv4(),
      entityId,
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
    };
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 500) this.eventLog.pop();
    return entry;
  }

  // === Command Actions ===

  issueDirective(shipId, type, params, issuedBy = 'command') {
    const ship = this.ships.get(shipId);
    if (!ship) throw new Error(`Ship ${shipId} not found`);

    const directive = {
      id: uuidv4(),
      shipId,
      type,
      params,
      issuedBy,
      issuedAt: new Date().toISOString(),
      status: 'pending',
      response: null,
    };
    this.directives.unshift(directive);
    this._emit('directive', directive);
    this.logEvent(shipId, 'DIRECTIVE_ISSUED', `Directive ${type} issued to ${ship.name}: ${JSON.stringify(params)}`, 'info');
    return directive;
  }

  respondToDirective(directiveId, response, captainMessage = '') {
    const directive = this.directives.find(d => d.id === directiveId);
    if (!directive) throw new Error('Directive not found');

    directive.status = response; // ACCEPTED or ESCALATED
    directive.response = captainMessage;
    directive.respondedAt = new Date().toISOString();

    const ship = this.ships.get(directive.shipId);

    if (response === 'ACCEPTED') {
      this._applyDirective(directive);
      this.logEvent(directive.shipId, 'DIRECTIVE_ACCEPTED', `${ship?.name} accepted directive ${directive.type}`, 'info');
    } else if (response === 'ESCALATED') {
      this.submitDistress(directive.shipId, captainMessage);
      this.logEvent(directive.shipId, 'DIRECTIVE_ESCALATED', `${ship?.name} escalated with distress: ${captainMessage}`, 'warning');
    }

    this._emit('directive_response', directive);
    return directive;
  }

  _applyDirective(directive) {
    const ship = this.ships.get(directive.shipId);
    if (!ship) return;

    switch (directive.type) {
      case 'REROUTE':
        ship.destination = directive.params.newDestination;
        ship.status = 'rerouting';
        ship.customWaypoint = null;
        this._computePath(directive.shipId);
        break;
      case 'WAYPOINT': {
        // Divert toward a custom lat/lng before resuming to port
        ship.customWaypoint = directive.params.waypoint;
        ship.status = 'rerouting';
        this._computePath(directive.shipId);
        break;
      }
      case 'HOLD':
        ship.status = 'stopped';
        ship.originalSpeed = ship.originalSpeed ?? ship.speed;
        ship.speed = 0;
        ship.holdUntil = directive.params.duration ? Date.now() + directive.params.duration * 60000 : null;
        break;
      case 'RESUME':
        ship.status = 'normal';
        ship.speed = ship.originalSpeed || 14;
        ship.holdUntil = null;
        this._computePath(directive.shipId);
        break;
      case 'SPEED_CHANGE':
        ship.originalSpeed = ship.speed;
        ship.speed = directive.params.speed;
        break;
      case 'ASSIST':
        ship.status = 'assisting';
        ship.assistTarget = directive.params.targetShipId;
        break;
      case 'INSPECT':
        ship.inspectionRequested = true;
        this.logEvent(ship.shipId, 'INSPECTION', `Cargo inspection requested for ${ship.name}: manifest is ${ship.cargo}, ${Math.round(ship.fuel)}t fuel aboard, crew of ${ship.crewCount}`, 'info');
        break;
    }
  }

  addRestrictedZone(zone) {
    const id = zone.id || uuidv4();
    const newZone = { ...zone, id, active: true, createdAt: new Date().toISOString() };
    this.restrictedZones.set(id, newZone);
    this.logEvent('SYSTEM', 'ZONE_ADDED', `Restricted zone "${zone.name}" established`, 'warning');
    
    // Reroute ships whose path intersects this zone
    for (const [shipId, ship] of this.ships) {
      if (ship.arrived || ship.status === 'stopped') continue;
      if (ship.path) {
        const intersects = ship.path.some(p => pointInPolygon(p[0], p[1], zone.polygon));
        if (intersects) {
          ship.status = 'rerouting';
          this._computePath(shipId);
          this.logEvent(shipId, 'REROUTE', `${ship.name} rerouting to avoid new restricted zone "${zone.name}"`, 'warning');
        }
      }
      // Check if ship is already inside zone
      if (pointInPolygon(ship.position[0], ship.position[1], zone.polygon)) {
        this._fireAlert(`${shipId}-ZONE-${id}`, 'GEOFENCE_BREACH', 
          `${ship.name} is already inside newly created restricted zone "${zone.name}"`, 'critical', shipId);
      }
    }

    this._emit('zone_update', { action: 'add', zone: newZone });
    return newZone;
  }

  removeRestrictedZone(zoneId) {
    const zone = this.restrictedZones.get(zoneId);
    if (!zone) return;
    this.restrictedZones.delete(zoneId);
    this.logEvent('SYSTEM', 'ZONE_REMOVED', `Restricted zone "${zone.name}" lifted`, 'info');
    // Recompute paths for rerouting ships
    for (const [shipId, ship] of this.ships) {
      if (ship.status === 'rerouting') this._computePath(shipId);
    }
    this._emit('zone_update', { action: 'remove', zoneId });
  }

  submitDistress(shipId, message) {
    const ship = this.ships.get(shipId);
    if (!ship) return;

    const distress = {
      id: uuidv4(),
      shipId,
      shipName: ship.name,
      message,
      timestamp: new Date().toISOString(),
      severity: null,
      extractedData: null,
      status: 'processing',
    };

    ship.status = 'distressed';
    ship.distressMessages.push(distress);
    this.distressMessages.unshift(distress);
    this._fireAlert(`DISTRESS-${shipId}-${distress.id}`, 'DISTRESS', `MAYDAY from ${ship.name}: ${message}`, 'critical', shipId);
    this._emit('distress', distress);
    return distress;
  }

  updateDistressAnalysis(distressId, analysis) {
    const distress = this.distressMessages.find(d => d.id === distressId);
    if (!distress) return;
    distress.severity = analysis.severity;
    distress.extractedData = analysis;
    distress.status = 'analyzed';
    this._emit('distress_update', distress);
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      this._emit('alert_update', alert);
    }
  }

  requestAssistance(fromShipId, toShipId, type) {
    const fromShip = this.ships.get(fromShipId);
    const toShip = this.ships.get(toShipId);
    if (!fromShip || !toShip) return null;

    const request = {
      id: uuidv4(),
      fromShipId,
      toShipId,
      fromShipName: fromShip.name,
      toShipName: toShip.name,
      type, // fuel_transfer | medical | escort | cargo_offload
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    this.assistanceRequests.unshift(request);
    if (this.assistanceRequests.length > 50) this.assistanceRequests.pop();

    this.logEvent(fromShipId, 'ASSISTANCE_REQUEST', `${fromShip.name} requesting ${type.replace('_',' ')} assistance from ${toShip.name}`, 'warning');
    this._emit('assistance_request', request);
    return request;
  }

  respondToAssistance(requestId, accept, message = '') {
    const req = this.assistanceRequests.find(r => r.id === requestId);
    if (!req) return null;
    req.status = accept ? 'accepted' : 'declined';
    req.respondedAt = new Date().toISOString();
    req.responseMessage = message;

    const fromShip = this.ships.get(req.fromShipId);
    const toShip = this.ships.get(req.toShipId);

    if (accept && fromShip && toShip) {
      // Apply effect based on type
      toShip.status = 'assisting';
      toShip.assistTarget = req.fromShipId;
      this._computePath(req.toShipId === toShip.shipId ? toShip.shipId : toShip.shipId);

      if (req.type === 'fuel_transfer') {
        const transfer = Math.min(1500, toShip.fuel * 0.25);
        toShip.fuel -= transfer;
        fromShip.fuel += transfer;
        if (fromShip.status === 'out_of_fuel' || fromShip.status === 'insufficient_fuel') {
          fromShip.status = 'normal';
          this._computePath(fromShip.shipId);
        }
        this.logEvent(toShip.shipId, 'FUEL_TRANSFER', `${toShip.name} transferred ${Math.round(transfer)}t fuel to ${fromShip.name}`, 'success');
      } else if (req.type === 'medical') {
        this.logEvent(toShip.shipId, 'MEDICAL_AID', `${toShip.name} dispatched medical team to assist ${fromShip.name}`, 'success');
      } else if (req.type === 'escort') {
        this.logEvent(toShip.shipId, 'ESCORT', `${toShip.name} is now escorting ${fromShip.name}`, 'success');
      } else if (req.type === 'cargo_offload') {
        this.logEvent(toShip.shipId, 'CARGO_OFFLOAD', `${toShip.name} is assisting with cargo offload for ${fromShip.name}`, 'success');
      }
    } else {
      this.logEvent(req.toShipId, 'ASSISTANCE_DECLINED', `${toShip?.name} declined assistance request from ${fromShip?.name}${message ? ': ' + message : ''}`, 'warning');
    }

    this._emit('assistance_response', req);
    return req;
  }

  /**
   * Admin/test override — directly mutate a ship's live fields for testing
   * purposes (e.g. force speed to 28kn, drain fuel to near-zero, teleport
   * into a zone) without going through the directive/approval pipeline.
   * Used exclusively by the Admin Test Console.
   */
  adminOverrideShip(shipId, patch) {
    const ship = this.ships.get(shipId);
    if (!ship) throw new Error(`Ship ${shipId} not found`);

    const allowed = ['speed', 'fuel', 'heading', 'status', 'position'];
    const applied = {};
    for (const key of allowed) {
      if (patch[key] === undefined) continue;
      if (key === 'position' && Array.isArray(patch.position) && patch.position.length === 2) {
        ship.position = [Number(patch.position[0]), Number(patch.position[1])];
        applied.position = ship.position;
      } else if (key === 'fuel') {
        ship.fuel = Math.max(0, Math.min(Number(patch.fuel), ship.fuelCapacity));
        applied.fuel = ship.fuel;
      } else if (key === 'speed') {
        ship.speed = Math.max(0, Math.min(Number(patch.speed), 40));
        applied.speed = ship.speed;
      } else if (key === 'heading') {
        ship.heading = ((Number(patch.heading) % 360) + 360) % 360;
        applied.heading = ship.heading;
      } else if (key === 'status') {
        ship.status = patch.status;
        applied.status = ship.status;
      }
    }
    this.logEvent(shipId, 'ADMIN_OVERRIDE', `[TEST] ${ship.name} force-set: ${JSON.stringify(applied)}`, 'warning');
    this._emit('fleet_update', this.getState());
    return ship;
  }

  /** Admin/test — force-fire a synthetic alert of any type for UI testing. */
  adminFireTestAlert(type = 'SYSTEM', severity = 'critical', message = 'Synthetic test alert', shipId = null) {
    return this._fireAlert(`TEST-${uuidv4()}`, type, message, severity, shipId);
  }

  getState() {
    return {
      ships: Array.from(this.ships.values()),
      ports: Array.from(this.ports.values()),
      zones: Array.from(this.restrictedZones.values()),
      alerts: Array.from(this.alerts.values()).filter(a => !a.acknowledged),
      allAlerts: Array.from(this.alerts.values()),
      directives: this.directives.slice(0, 50),
      distressMessages: this.distressMessages.slice(0, 20),
      assistanceRequests: this.assistanceRequests.slice(0, 20),
      operators: this.getActiveOperators(),
      weatherZones: this.weatherZones,
      tickCount: this.tickCount,
      simTimeMultiplier: this.simTimeMultiplier,
      timestamp: new Date().toISOString(),
    };
  }

  getHistory() {
    return this.history;
  }

  getEventLog(limit = 100) {
    return this.eventLog.slice(0, limit);
  }

  on(listener) {
    this.listeners.push(listener);
  }

  _emit(type, data) {
    for (const listener of this.listeners) {
      try { listener(type, data); } catch (e) { /* ignore */ }
    }
  }
}

module.exports = ShipSimulator;
