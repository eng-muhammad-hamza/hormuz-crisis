# ⚓ HORMUZ CRISIS — Maritime Fleet Command System

> Real-time maritime crisis operations command center for the Strait of Hormuz. 15 vessels, live simulation, AI-powered distress analysis, 4 visual modes.

---

## 🚀 Quick Start

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

## 🎖️ Operational Roles

When you connect, you choose a role **and enter your name** — this identity is shown to Command in real time and logged on every directive, distress call, and assistance request you send or receive. Other vessels in the fleet are crewed by procedurally-named captains (e.g. "Capt. Reyes") until a human takes the helm.

| Role | Access |
|------|--------|
| **COMMAND** | Full fleet visibility, issue directives to any ship (reroute, waypoint divert, hold, resume, change speed, request cargo inspection), draw/remove restricted zones, coordinate mutual aid between vessels, consult the AI Fleet Advisor, view predictive risk forecasts and analytics |
| **CAPTAIN** | Single-vessel view, respond to directives (ACCEPT or ESCALATE_DISTRESS), submit MAYDAY messages, request mutual aid for your own vessel, accept or decline aid requests from other ships |
| **OBSERVER** | Full read-only fleet view, real-time updates, sees the same operator identities as Command |
| **ADMIN** | Everything Command and Captain can do, simultaneously, for any ship — plus the [Admin Test Console](#-admin-test-console) for direct overrides. Exists purely to verify the system end-to-end without needing two browser tabs. |

### What Command can do to a ship
- **Reroute** — send to a different port; the A* router recomputes the path live
- **Divert via waypoint** — arm the waypoint picker, click anywhere on the map; the vessel diverts there then automatically resumes its original course
- **Hold position** / **Resume course**
- **Change speed** (4–28 knots, live slider)
- **Request cargo inspection** — logs manifest, fuel, and crew count to the mission log
- **Coordinate mutual aid** — pair any two vessels for fuel transfer, medical aid, escort, or cargo offload
- **Draw / remove restricted zones** — click-to-place polygon vertices on the map; a management list with one-click **Remove** buttons appears whenever zones are active
- **Consult the AI Fleet Advisor** — Claude analyzes the live fleet situation and returns 3–5 prioritized, actionable recommendations
- **Review predictive forecasts** — a 2-hour look-ahead surfaces fuel shortfalls, zone-entry collisions, and weather intersections before they happen

### What a Captain can do
- **Accept or escalate** any directive from Command (escalating sends a free-form distress message instead of complying)
- **Broadcast MAYDAY** — free text, automatically analyzed by AI for severity, injury count, and damage estimate
- **Request mutual aid** for their own ship from any nearby vessel
- **Accept or decline** aid requests addressed to their ship — accepting a fuel transfer actually moves fuel between the two vessels' tanks in the simulation


---

## 🗺️ Visual Modes

The interface ships with two refined console modes, built on a Tailwind v4 `@theme` token system (every color, surface, and spacing value is a real Tailwind utility — `bg-surface-1`, `text-ink-2`, `border-line`, `text-accent`, etc. — not inline styles):

| Mode | Description |
|------|-------------|
| **DARK OPS** | Low-light console — deep navy-black surfaces, cyan accent, 4-level elevation system |
| **DAYLIGHT** | High-contrast warm paper-white console for daytime bridge use |

Switching is a single `data-theme` attribute swap on `<html>` — every color, including the fixed ship-status hex values used on canvas/SVG layers, repaints instantly with no flash.

> **Note:** Earlier prototypes included "Radar War" and "Nav Chart" tactical overlay modes. They added visual noise without functional value (the radar projection didn't reliably align with the live map) and have been removed entirely in favor of two well-executed console modes.

---

## ⚙️ System Architecture

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

## 🛳️ Fleet Simulation

### Ship Movement
- Each ship runs A* pathfinding on an 80×100 navigable water grid
- Paths are simplified with Douglas-Peucker algorithm
- Ships advance at 1Hz, path recalculated when zones intersect route

### Fuel Model
- Burn rate scales with **speed cubed** relative to a 14-knot reference (`burn ∝ (speed/14)³`) — physically, drag-driven fuel consumption roughly follows a cubic curve, so ordering a ship to flank speed burns disproportionately more fuel, not just proportionally more
- +30% fuel penalty on top of that while in adverse weather zones
- Predictive alerts fire when projected fuel < needed fuel for the remaining route
- **Simulated time multiplier**: each real-world second advances the simulation clock by `simTimeMultiplier` seconds (default **90×**). This keeps fuel burn, distance traveled, and ETA internally consistent with each other while making the whole fleet's progress visible within a normal testing session — at the default rate a 14kn vessel measurably loses fuel within the first minute of watching, rather than requiring a multi-hour real-time wait to see any change. The Admin Test Console can push this to 30×–3600× on demand.

### Routing Triggers
- New restricted zone drawn that intersects current path
- Captain accepts REROUTE or WAYPOINT directive from Command
- Zone removed → ships automatically recompute optimal path

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

### Ship identity
Every vessel carries a `defaultCaptainName` (procedurally assigned at boot) and a `crewCount`. The moment a human Captain authenticates against a ship, `assignedCaptain` switches to their entered name and `operatorSessionId` is set — Command and Observers see a filled/hollow dot (`●`/`○`) next to the ship's captain name to distinguish a live human from a simulated one. Disconnecting reverts the ship to its default captain.

---

## 🛠️ Admin Test Console

A fourth login role, separate from Command/Captain/Observer, intended purely for verifying the system works rather than for normal operation:

- **Force any ship's live values** — speed, heading, fuel, status — bypassing the directive/approval pipeline entirely, with one-click presets ("Drain to 0", "Max speed")
- **Fire a synthetic alert of any type/severity on demand**, to confirm the alert pipeline and sound actually fire without waiting for a real incident
- **Preview or toggle the continuous war siren independently**, so you can hear it without needing a live critical alert
- **Run a full Command → Captain directive cycle alone** — issues the directive as Command and immediately auto-accepts it as the target ship's Captain on the same connection, proving the round trip works without needing two browser tabs
- **Control simulation speed** (30×–3600×) to fast-forward fuel burn and voyages for testing
- **A live, auto-refreshing fleet snapshot table** of every ship's status, fuel %, and speed

Admin sessions are also granted full Command *and* Captain authority simultaneously in every other panel (Directives, Mutual Aid, ship detail actions), so the entire request/response loop can be exercised from one login.

---

## 🔊 Audio / Siren System

Browsers block audio output until a user gesture unlocks it; the previous implementation created a fresh `AudioContext` per sound, which silently failed after the first call in most browsers — alerts looked like they fired but were never actually audible. This has been replaced with a single shared, persistent `AudioContext` (`lib/audio.ts`):

- `unlockAudio()` fires on the very first click in the app (role selection on the login screen)
- One-shot chimes (`alert`, `distress`, `warning`, `arrival`, `directive`, `success`) for discrete events
- A genuine **continuous two-tone war siren** (`startSiren()` / `stopSiren()`) that wails for as long as any critical alert remains unacknowledged anywhere in the fleet, and stops the instant it's cleared — independent of the one-shot chimes
- The Admin Test Console exposes direct buttons to preview every chime and toggle the siren manually, so its behavior can be verified without waiting for a real critical event

---

## 🤖 AI Integration

Distress messages are processed by Claude (Anthropic) via `/api/analyze-distress`:

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

## 📡 WebSocket Protocol

### Client → Server

| Message Type | Description |
|---|---|
| `authenticate` | Set role, shipId, and **operatorName** — registers the human's identity against the simulator |
| `issue_directive` | Command issues directive to ship — `REROUTE`, `WAYPOINT`, `HOLD`, `RESUME`, `SPEED_CHANGE`, `INSPECT` |
| `respond_directive` | Captain ACCEPTS or ESCALATES |
| `add_zone` | Command draws restricted zone |
| `remove_zone` | Command removes zone |
| `submit_distress` | Captain sends MAYDAY |
| `acknowledge_alert` | ACK an active alert |
| `request_assistance` | Request ship-to-ship aid (fuel transfer, medical, escort, cargo offload) |
| `respond_assistance` | Receiving captain accepts (applies the real effect — e.g. fuel actually moves between tanks) or declines |
| `admin_override_ship` | **Admin only** — directly force a ship's speed, fuel, heading, status, or position, bypassing approval |
| `admin_fire_test_alert` | **Admin only** — fire a synthetic alert of any type/severity for pipeline verification |
| `admin_set_sim_speed` | **Admin only** — change `simTimeMultiplier` (30×–3600×) |
| `admin_issue_and_accept_directive` | **Admin only** — issues a directive as Command and immediately auto-accepts it as Captain on the same connection |

### Server → Client

| Message Type | Description |
|---|---|
| `init` | Full state on connect, including active `operators` and `assistanceRequests` |
| `fleet_update` | Full state snapshot (1Hz) |
| `alert` | New alert fired |
| `directive` / `directive_received` | Directive issued |
| `directive_response` | Captain responded |
| `distress` | New distress message |
| `distress_update` | AI analysis completed |
| `zone_update` | Zone added/removed |
| `assistance_request` | A vessel is requesting aid |
| `assistance_response` | Aid request accepted/declined, with the resulting effect already applied |
| `client_count` | Connected operators |
| `admin_override_applied` | Confirms an admin override was applied, with the resulting ship state |
| `admin_directive_cycle_complete` | Confirms the admin's issue→accept directive cycle finished |
| `sim_speed_changed` | Broadcasts the new `simTimeMultiplier` to every connected client |

---

## 🔔 Alert Types

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

## 🌊 Weather Zones

Three pre-configured simulated weather zones:
- **Gulf Squall Alpha** — Moderate, 35kn winds (near Strait of Hormuz)
- **Persian Dust Storm** — Severe, 55kn winds (central Persian Gulf)
- **Oman Sea Chop** — Light, 22kn winds (Gulf of Oman)

Ships in weather zones incur +30% fuel burn. Command can reroute ships around weather.

---

## 📊 Features Overview

- ✅ 15 active ships with A* pathfinding in navigable waters
- ✅ Real-time WebSocket sync (1Hz, <500ms delivery)
- ✅ Role-based access: Command / Captain / Observer / Admin, each with a captured human identity (name) visible to Command
- ✅ Interactive zone drawing **and removal** on the map (Command only) with a live zone management list
- ✅ Waypoint diversion — click-to-place a diversion point on the map; vessel auto-resumes original course after reaching it
- ✅ Cargo inspection directive — logs manifest, fuel, and crew count on demand
- ✅ Geofence breach alerts (<1 second)
- ✅ Proximity collision warnings (2km threshold)
- ✅ Physically-grounded fuel model (speed³ drag scaling) with an adjustable simulated-time multiplier so burn-down is actually observable live, not just on paper
- ✅ AI distress message analysis (Claude API) with graceful rule-based fallback
- ✅ AI Fleet Advisor — proactive, prioritized recommendations for Command, generated from live fleet state
- ✅ Predictive panel — 2-hour look-ahead for fuel shortfalls, zone collisions, and weather intersections, using the same fuel formula as the backend
- ✅ Ship-to-ship mutual aid with **real simulated effects** — accepted fuel transfers move actual tons between tanks; escort/medical/cargo-offload requests update both vessels' status and the mission log
- ✅ Admin Test Console — force any ship's values, fire synthetic alerts, toggle the siren, run a full directive cycle alone, control sim speed
- ✅ A genuine continuous war siren (not a single beep) that loops while any critical alert is outstanding, built on a persistent shared `AudioContext` that's correctly unlocked on first user interaction
- ✅ Two refined console themes (Dark Ops / Daylight), built entirely on Tailwind v4 `@theme` tokens — no ad-hoc inline color values
- ✅ Playback timeline (30-second snapshots, 1-hour history)
- ✅ Mission event log
- ✅ Fleet analytics (status pie, fuel bars, history chart, cargo manifest, weather impact)
- ✅ Smooth ship movement interpolation with directional wake trails
- ✅ Single closeable side-panel system — every panel (Alerts, Distress, Directives, Analytics, Predictive, Advisor, Assistance, Admin) opens via a TopBar toggle and always has a visible ✕ to close
- ✅ Fuel bars, ETA, heading, weather indicators per ship
- ✅ GSAP-powered fuel-digit ticker and alert screen-shake, layered alongside Framer Motion (used for layout/mount transitions throughout)
- ✅ Docker Compose deployment

---

## 📝 Documented Assumptions

1. **Weather data**: Simulated weather zones are used instead of live API data (Open-Meteo would require network access during judging). Three representative zones cover the operational area.
2. **Map tiles**: CartoDB tiles are hardcoded per theme (allowed per spec).
3. **Fuel burn**: A speed³ drag-scaled model normalized against a 14-knot reference rate, rather than vessel-class specific consumption curves. A `simTimeMultiplier` (default 90×) advances simulated time faster than real time so the model's effects are observable in a normal testing session.
4. **Port accessibility**: Ships navigate to the nearest navigable water cell to port coordinates (some ports are at grid edges).
5. **Playback**: Stores 30-second snapshots for 1 hour (120 snapshots). Full state reconstruction at arbitrary timestamps is not implemented per spec allowance.
6. **Multiple route options**: Basic implementation — single optimal A* path. Multi-candidate routing (bonus) would use k-shortest paths algorithm.
7. **Supabase**: Omitted in favor of in-memory state to keep the system self-contained and runnable on a laptop without cloud dependencies.
8. **Admin role**: Not part of the original brief's role set — added specifically as a verification tool. It has no in-universe justification (no "Admin" exists on a real ship) and is clearly labeled as a test console in the UI.

---

## 🏆 Bonus Features Implemented

- **Predictive alerts**: Zone entry and fuel shortfall forecast up to 2 hours ahead in a dedicated panel
- **Ship-to-ship assistance**: Full request → accept/decline → effect pipeline (fuel actually transfers between vessels; escort/medical/cargo-offload update both ships' state)
- **AI fleet advisor**: Beyond reactive distress parsing, proactively analyzes the whole fleet and returns ranked, reasoned recommendations Command can act on
- **Operator identity system**: Human names are captured at login, propagated through the simulator, and shown to Command/Observers — distinguishing live-crewed ships from simulated ones
- **Waypoint diversion routing**: A* re-routes through an arbitrary operator-placed point, then automatically resumes the original destination — not just port-to-port rerouting
- **Admin Test Console**: A dedicated verification surface with direct ship overrides, synthetic alert firing, siren toggling, an autonomous directive-cycle runner, and simulation-speed control — built so every claimed feature can actually be checked without guesswork

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes (for AI) | — | Claude API key for distress analysis |
| `NEXT_PUBLIC_WS_URL` | No | `ws://localhost:4000` | Backend WebSocket URL |
| `PORT` | No | `4000` | Backend server port |
