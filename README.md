# HORMUZ CRISIS — Maritime Fleet Command System

> Real-time maritime crisis operations command center for the Strait of Hormuz. 15 vessels, live simulation, AI-powered distress analysis, 2 visual modes.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-Backend-lightgrey?logo=express)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose (optional)

### Environment Setup

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Run with Docker

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
```

### Run Manually (Development)

```bash
# Terminal 1 — Backend
cd backend
npm install
node index.js

# Terminal 2 — Frontend
cd frontend
npm install
NEXT_PUBLIC_WS_URL=ws://localhost:4000 npm run dev
```

---

## Operational Roles

Each operator chooses a role and enters their name upon connection. This identity is displayed to Command and logged for all directives, distress calls, and assistance requests. Uncrewed vessels are assigned procedurally-generated captain names.

| Role | Access |
|------|--------|
| **COMMAND** | Full fleet visibility, issue directives (reroute, divert, hold, resume, change speed, inspect cargo), manage restricted zones, coordinate mutual aid, consult AI Fleet Advisor, view predictive risk forecasts. |
| **CAPTAIN** | Single-vessel view, respond to directives (ACCEPT or ESCALATE_DISTRESS), submit MAYDAY messages, request/respond to mutual aid. |
| **OBSERVER** | Full read-only fleet view with real-time updates and operator identities. |
| **ADMIN** | Combined Command and Captain privileges for any ship, plus the Admin Test Console for system verification. |

### Command Capabilities
- **Reroute**: Send ship to a different port (live A* recomputing).
- **Divert via waypoint**: Divert a vessel to a specific map point before resuming its course.
- **Hold position / Resume course**
- **Change speed**: Adjustable 4–28 knots.
- **Request cargo inspection**: Logs manifest, fuel, and crew count.
- **Coordinate mutual aid**: Pair vessels for fuel transfer, medical aid, escort, or cargo offload.
- **Manage restricted zones**: Draw/remove polygon zones on the map.
- **AI Fleet Advisor**: Obtain 3–5 prioritized, actionable recommendations from the Claude analysis engine.
- **Predictive forecasts**: 2-hour look-ahead for fuel shortfalls, zone collisions, and weather intersections.

### Captain Capabilities
- **Accept or escalate** directives (escalating sends a distress message).
- **Broadcast MAYDAY**: Free text submission, analyzed by AI for severity, injuries, and damage.
- **Request mutual aid** from nearby vessels.
- **Accept or decline** aid requests (e.g., fuel transfers apply real simulated changes).

---

## Visual Modes

The interface provides two console modes built with Tailwind v4 `@theme` tokens:

| Mode | Description |
|------|-------------|
| **DARK OPS** | Low-light console with deep navy-black surfaces and cyan accents. |
| **DAYLIGHT** | High-contrast warm paper-white console for daytime use. |

Theme switching uses a `data-theme` attribute on `<html>` for instant repaints.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 15)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Fleet Map│ │ Admin    │ │Analytics │ │Distress  │  │
│  │ (Leaflet)│ │ Console  │ │(Recharts)│ │(AI)      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌─────────────────────────────────────────────────┐   │
│  │    Zustand Store ← WebSocket ← Backend          │   │
│  │    (Tailwind v4 @theme tokens · Framer + GSAP)  │   │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │ WS (1Hz)
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Express + WS)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Simulator   │  │   A* Router  │  │  Alert Engine│ │
│  │  (1Hz tick,  │  │  (Grid 80×100│  │  (Geofence,  │ │
│  │  90× sim     │  │   A*)        │  │   Proximity, │ │
│  │  speed)      │  │              │  │   Admin ovr) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Fleet Simulation

### Ship Movement
- A* pathfinding on an 80×100 navigable water grid.
- Paths simplified with the Douglas-Peucker algorithm.
- 1Hz update rate; paths recalculate upon zone intersection.

### Fuel Model
- Burn rate scales with **speed cubed** relative to a 14-knot reference (`burn ∝ (speed/14)³`).
- 30% fuel penalty applied in adverse weather zones.
- Predictive alerts trigger when projected fuel is insufficient for the remaining route.
- **Simulated time multiplier**: Real-world seconds advance the simulation by `simTimeMultiplier` (default 90×). 

### Routing Triggers
- Intersections with new restricted zones.
- Captain accepts REROUTE or WAYPOINT directives.
- Automatic optimal path recomputation upon zone removal.

### Status States
| Status | Meaning |
|--------|---------|
| `normal` | Proceeding to destination |
| `rerouting` | Recomputing path around an obstacle or diversion waypoint |
| `distressed` | Captain submitted MAYDAY |
| `insufficient_fuel` | Fuel may not reach destination |
| `out_of_fuel` | Fuel depleted, ship stopped |
| `stranded` | No navigable path to destination |
| `arrived` | Docked at destination port |
| `stopped` | HOLD directive accepted |
| `assisting` | En route to or actively assisting another vessel |

---

## Admin Test Console

A verification role used to test system components independently:

- **Force ship state**: Override speed, heading, fuel, status, or position.
- **Synthetic alerts**: Fire alerts of any type/severity for pipeline verification.
- **Siren testing**: Preview or toggle the continuous war siren manually.
- **Autonomous directive cycle**: Issue and auto-accept directives simultaneously.
- **Simulation speed control**: Adjust `simTimeMultiplier` (30×–3600×).
- **Fleet snapshot**: Live-refreshing table of fleet status, fuel, and speed.

---

## Audio System

The audio implementation uses a shared, persistent `AudioContext` (`lib/audio.ts`):

- Initializes on first user interaction.
- One-shot chimes (`alert`, `distress`, `warning`, `arrival`, `directive`, `success`).
- Continuous two-tone siren that loops for active critical alerts.

---

## AI Integration

Distress messages are analyzed by Claude via `/api/analyze-distress`:

**Input:** Free-form captain message  
**Output:**
```json
{
  "severity": "critical",
  "issues": ["fire onboard", "hull breach"],
  "injuryCount": 3,
  "damageEstimate": 500000,
  "requiresImmediateAction": true,
  "recommendedAction": "Dispatch nearest vessel immediately",
  "confidence": 0.92,
  "cargoRisk": "high",
  "environmentalRisk": "medium"
}
```

---

## WebSocket Protocol

### Client → Server

| Message Type | Description |
|---|---|
| `authenticate` | Register operator role and identity. |
| `issue_directive` | Issue `REROUTE`, `WAYPOINT`, `HOLD`, `RESUME`, `SPEED_CHANGE`, or `INSPECT`. |
| `respond_directive` | Captain `ACCEPTS` or `ESCALATES`. |
| `add_zone` / `remove_zone` | Manage restricted zones. |
| `submit_distress` | Captain sends MAYDAY. |
| `acknowledge_alert` | ACK an active alert. |
| `request_assistance` / `respond_assistance` | Manage ship-to-ship aid requests and responses. |
| `admin_override_ship` | Force ship state parameters. |
| `admin_fire_test_alert` | Fire synthetic alerts. |
| `admin_set_sim_speed` | Change `simTimeMultiplier`. |
| `admin_issue_and_accept_directive` | Complete a directive loop in one action. |

### Server → Client

| Message Type | Description |
|---|---|
| `init` | Full initial state on connect. |
| `fleet_update` | Full state snapshot (1Hz). |
| `alert` | Fired when new alert generated. |
| `directive` / `directive_received` / `directive_response` | Directive state updates. |
| `distress` / `distress_update` | Distress event and AI analysis completion. |
| `zone_update` | Restricted zone updates. |
| `assistance_request` / `assistance_response` | Mutual aid event updates. |
| `client_count` | Number of connected operators. |
| `admin_override_applied` / `admin_directive_cycle_complete` / `sim_speed_changed` | Admin action confirmations. |

---

## Alert Types

| Type | Trigger |
|------|---------|
| `GEOFENCE_BREACH` | Ship enters restricted zone |
| `PROXIMITY` | Two ships within 2km |
| `DISTRESS` | Captain sends MAYDAY |
| `FUEL_LOW` | Fuel insufficient for route |
| `OUT_OF_FUEL` | Ship runs dry |
| `STRANDED` | No valid path exists |
| `PREDICTIVE_ZONE` | Ship will enter zone in ~3 min |
| `PREDICTIVE_FUEL` | Fuel shortfall predicted |
| `ARRIVED` | Ship docked at destination |

---

## Weather Zones

Pre-configured simulated weather zones apply a +30% fuel burn penalty:
- **Gulf Squall Alpha**: Moderate, 35kn winds
- **Persian Dust Storm**: Severe, 55kn winds
- **Oman Sea Chop**: Light, 22kn winds

---

## Features Overview

- 15 active ships with A* pathfinding.
- Real-time WebSocket sync (1Hz).
- Role-based access control with captured operator identities.
- Interactive map-based restricted zone management.
- Waypoint diversion routing.
- Cargo inspection directives.
- Low-latency geofence and proximity alerts.
- Physical fuel model (speed³ scaling) with adjustable simulation time.
- AI distress message analysis (Claude API) with rule-based fallback.
- AI Fleet Advisor for proactive recommendations.
- Predictive panel for fuel and collision forecasting.
- Simulated ship-to-ship mutual aid mechanics.
- Admin Test Console for system verification.
- Continuous audio siren for critical alerts.
- Two console themes (Dark Ops / Daylight) via Tailwind v4.
- Playback timeline (1-hour history).
- Mission event log and fleet analytics.
- Smooth ship movement interpolation with wake trails.
- Docker Compose deployment.

---

## Technical Considerations

1. **Weather data**: Simulated weather zones used instead of live API data.
2. **Fuel burn**: Speed³ drag-scaled model normalized against a 14-knot reference rate.
3. **Port accessibility**: Ships navigate to the nearest navigable grid cell to port coordinates.
4. **Playback**: Stores 30-second snapshots for 1 hour without full state reconstruction.
5. **Storage**: In-memory state utilized to maintain local execution without external database dependencies.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key for distress analysis |
| `NEXT_PUBLIC_WS_URL` | No | `ws://localhost:4000` | Backend WebSocket URL |
| `PORT` | No | `4000` | Backend server port |
