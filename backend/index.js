require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const ShipSimulator = require('./engine/simulator');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// WebSocket server
const wss = new WebSocket.Server({ server });

// Global simulator
const sim = new ShipSimulator();

// Client registry: { ws, role, shipId, sessionId }
const clients = new Map();

// AI distress analysis using Anthropic API (simulated here, real in frontend)
async function analyzeDistress(message, shipId, shipName) {
  // Simple rule-based analysis for backend (real AI called from frontend)
  const lower = message.toLowerCase();
  let severity = 'low';
  let issues = [];
  let injuryCount = 0;
  let damageEstimate = 0;

  if (lower.includes('fire') || lower.includes('explosion')) { severity = 'critical'; issues.push('fire'); damageEstimate = 500000; }
  if (lower.includes('sinking') || lower.includes('flooding') || lower.includes('taking on water')) { severity = 'critical'; issues.push('hull breach'); damageEstimate = 2000000; }
  if (lower.includes('injured') || lower.includes('casualties') || lower.includes('medical')) { severity = 'high'; issues.push('medical emergency'); }
  if (lower.includes('engine') || lower.includes('propulsion')) { severity = severity === 'critical' ? 'critical' : 'high'; issues.push('propulsion failure'); }
  if (lower.includes('fuel') || lower.includes('stranded')) { severity = severity === 'critical' ? 'critical' : 'medium'; issues.push('fuel emergency'); }
  if (lower.includes('piracy') || lower.includes('attack') || lower.includes('boarded')) { severity = 'critical'; issues.push('security threat'); }
  
  // Extract injury count
  const injuryMatch = lower.match(/(\d+)\s*(injured|hurt|wounded|casualties)/);
  if (injuryMatch) injuryCount = parseInt(injuryMatch[1]);

  if (issues.length === 0) { severity = 'medium'; issues = ['undisclosed emergency']; }

  return {
    severity,
    issues,
    injuryCount,
    damageEstimate,
    requiresImmediateAction: severity === 'critical',
    recommendedAction: severity === 'critical' ? 'Dispatch nearest vessel for assistance immediately' : 'Monitor situation and prepare contingency',
    confidence: 0.82,
  };
}

// Broadcast to all connected clients (optionally filtered by role)
function broadcast(type, data, roleFilter = null) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  for (const [sessionId, client] of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;
    if (roleFilter && client.role !== roleFilter) continue;
    client.ws.send(message);
  }
}

// Broadcast to specific ship's captain
function broadcastToCaptain(shipId, type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  for (const [, client] of clients) {
    if (client.ws.readyState === WebSocket.OPEN && client.role === 'captain' && client.shipId === shipId) {
      client.ws.send(message);
    }
  }
}

// Simulator event → WebSocket broadcast
sim.on((type, data) => {
  switch (type) {
    case 'fleet_update':
      broadcast('fleet_update', data);
      break;
    case 'alert':
      broadcast('alert', data);
      break;
    case 'alert_update':
      broadcast('alert_update', data);
      break;
    case 'directive':
      broadcast('directive', data);
      broadcastToCaptain(data.shipId, 'directive_received', data);
      break;
    case 'directive_response':
      broadcast('directive_response', data);
      break;
    case 'distress':
      broadcast('distress', data);
      // Auto-analyze
      analyzeDistress(data.message, data.shipId, data.shipName).then(analysis => {
        sim.updateDistressAnalysis(data.id, analysis);
        broadcast('distress_update', { ...data, ...analysis, extractedData: analysis });
      });
      break;
    case 'distress_update':
      broadcast('distress_update', data);
      break;
    case 'zone_update':
      broadcast('zone_update', data);
      break;
    case 'assistance_request':
      broadcast('assistance_request', data);
      break;
    case 'assistance_response':
      broadcast('assistance_response', data);
      broadcast('fleet_update', sim.getState());
      break;
  }
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const sessionId = uuidv4();
  const client = { ws, role: 'observer', shipId: null, sessionId };
  clients.set(sessionId, client);

  console.log(`Client connected: ${sessionId} (${clients.size} total)`);

  // Send initial state
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      sessionId,
      state: sim.getState(),
      history: sim.getHistory(),
      eventLog: sim.getEventLog(),
    },
    timestamp: new Date().toISOString(),
  }));

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'authenticate':
        client.role = msg.role || 'observer';
        client.shipId = msg.shipId || null;
        client.operatorName = msg.operatorName || null;
        sim.registerOperator(sessionId, { name: client.operatorName, role: client.role, shipId: client.shipId });
        ws.send(JSON.stringify({ type: 'authenticated', data: { role: client.role, shipId: client.shipId, operatorName: client.operatorName }, timestamp: new Date().toISOString() }));
        broadcast('client_count', { count: clients.size });
        broadcast('fleet_update', sim.getState());
        break;

      case 'issue_directive':
        if (client.role !== 'command' && client.role !== 'admin') {
          ws.send(JSON.stringify({ type: 'error', data: { message: 'Unauthorized' } }));
          break;
        }
        try {
          const directive = sim.issueDirective(msg.shipId, msg.directiveType, msg.params, client.role === 'admin' ? 'admin-test-console' : 'command');
          ws.send(JSON.stringify({ type: 'directive_issued', data: directive, timestamp: new Date().toISOString() }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', data: { message: e.message } }));
        }
        break;

      case 'respond_directive':
        if (client.role !== 'captain' && client.role !== 'admin') {
          ws.send(JSON.stringify({ type: 'error', data: { message: 'Only captains can respond to directives' } }));
          break;
        }
        try {
          const result = sim.respondToDirective(msg.directiveId, msg.response, msg.captainMessage);
          ws.send(JSON.stringify({ type: 'directive_response_sent', data: result, timestamp: new Date().toISOString() }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', data: { message: e.message } }));
        }
        break;

      case 'add_zone':
        if (client.role !== 'command' && client.role !== 'admin') {
          ws.send(JSON.stringify({ type: 'error', data: { message: 'Only command can add zones' } }));
          break;
        }
        const zone = sim.addRestrictedZone(msg.zone);
        ws.send(JSON.stringify({ type: 'zone_added', data: zone, timestamp: new Date().toISOString() }));
        break;

      case 'remove_zone':
        if (client.role !== 'command' && client.role !== 'admin') break;
        sim.removeRestrictedZone(msg.zoneId);
        break;

      case 'submit_distress':
        const distress = sim.submitDistress(msg.shipId || client.shipId, msg.message);
        ws.send(JSON.stringify({ type: 'distress_submitted', data: distress, timestamp: new Date().toISOString() }));
        break;

      case 'acknowledge_alert':
        sim.acknowledgeAlert(msg.alertId);
        break;

      case 'request_assistance':
        const assist = sim.requestAssistance(msg.fromShipId, msg.toShipId, msg.assistType);
        ws.send(JSON.stringify({ type: 'assistance_requested', data: assist, timestamp: new Date().toISOString() }));
        break;

      case 'respond_assistance':
        try {
          const result = sim.respondToAssistance(msg.requestId, msg.accept, msg.message || '');
          ws.send(JSON.stringify({ type: 'assistance_responded', data: result, timestamp: new Date().toISOString() }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', data: { message: e.message } }));
        }
        break;

      // ── Admin / Test Console ──────────────────────────────────────────
      // Gated on role === 'admin' so this can never be reached by Command,
      // Captain, or Observer sessions — only someone who explicitly chose
      // the Admin Test Console at login.
      case 'admin_override_ship_disabled':
        if (client.role !== 'admin') { ws.send(JSON.stringify({ type: 'error', data: { message: 'Admin access required' } })); break; }
        try {
          const ship = sim.adminOverrideShip(msg.shipId, msg.patch || {});
          ws.send(JSON.stringify({ type: 'admin_override_applied', data: ship, timestamp: new Date().toISOString() }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', data: { message: e.message } }));
        }
        break;

      case 'admin_fire_test_alert':
        if (client.role !== 'admin') { ws.send(JSON.stringify({ type: 'error', data: { message: 'Admin access required' } })); break; }
        sim.adminFireTestAlert(msg.alertType, msg.severity, msg.message, msg.shipId);
        break;

      case 'admin_set_sim_speed':
        if (client.role !== 'admin') { ws.send(JSON.stringify({ type: 'error', data: { message: 'Admin access required' } })); break; }
        const newSpeed = sim.setSimTimeMultiplier(msg.multiplier);
        broadcast('sim_speed_changed', { multiplier: newSpeed });
        break;

      // Admin can also issue directives directly AND immediately approve them
      // on the same connection, to exercise the full Command->Captain loop alone.
      case 'admin_issue_and_accept_directive':
        if (client.role !== 'admin') { ws.send(JSON.stringify({ type: 'error', data: { message: 'Admin access required' } })); break; }
        try {
          const directive = sim.issueDirective(msg.shipId, msg.directiveType, msg.params || {}, 'admin-test-console');
          const response = sim.respondToDirective(directive.id, msg.autoResponse || 'ACCEPTED', msg.captainMessage || 'Auto-accepted via Admin Test Console');
          ws.send(JSON.stringify({ type: 'admin_directive_cycle_complete', data: response, timestamp: new Date().toISOString() }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', data: { message: e.message } }));
        }
        break;

      case 'get_history':
        ws.send(JSON.stringify({ type: 'history', data: sim.getHistory(), timestamp: new Date().toISOString() }));
        break;

      case 'get_event_log':
        ws.send(JSON.stringify({ type: 'event_log', data: sim.getEventLog(), timestamp: new Date().toISOString() }));
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(sessionId);
    sim.unregisterOperator(sessionId);
    broadcast('client_count', { count: clients.size });
    broadcast('fleet_update', sim.getState());
    console.log(`Client disconnected: ${sessionId} (${clients.size} remaining)`);
  });

  ws.on('error', (err) => {
    console.error(`WS error for ${sessionId}:`, err.message);
    clients.delete(sessionId);
  });
});

// REST API endpoints
app.get('/api/state', (req, res) => {
  res.json(sim.getState());
});

app.get('/api/history', (req, res) => {
  res.json(sim.getHistory());
});

app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(sim.getEventLog(limit));
});

app.get('/api/ships', (req, res) => {
  res.json(Array.from(sim.ships.values()));
});

app.get('/api/ships/:shipId', (req, res) => {
  const ship = sim.ships.get(req.params.shipId);
  if (!ship) return res.status(404).json({ error: 'Ship not found' });
  res.json(ship);
});

app.post('/api/zones', (req, res) => {
  const zone = sim.addRestrictedZone(req.body);
  res.json(zone);
});

app.delete('/api/zones/:zoneId', (req, res) => {
  sim.removeRestrictedZone(req.params.zoneId);
  res.json({ success: true });
});

app.post('/api/directive', (req, res) => {
  try {
    const d = sim.issueDirective(req.body.shipId, req.body.type, req.body.params, 'api');
    res.json(d);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    clients: clients.size,
    ships: sim.ships.size,
    alerts: sim.alerts.size,
    tick: sim.tickCount,
    uptime: process.uptime(),
  });
});

// Start tick loop (1 Hz)
const TICK_INTERVAL = 1000;
let tickInterval = setInterval(() => {
  sim.tick();
}, TICK_INTERVAL);

// Cleanup dead connections every 30s
setInterval(() => {
  for (const [sessionId, client] of clients) {
    if (client.ws.readyState === WebSocket.CLOSED || client.ws.readyState === WebSocket.CLOSING) {
      clients.delete(sessionId);
    }
  }
}, 30000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   HORMUZ CRISIS COMMAND SERVER v1.0     ║
║   Port: ${PORT}                             ║
║   Status: OPERATIONAL                   ║
║   Fleet: 15 vessels active              ║
╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  clearInterval(tickInterval);
  server.close();
});

module.exports = { app, server, sim };
