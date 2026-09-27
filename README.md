# ⚓ HORMUZ CRISIS — Maritime Fleet Command System

> Real-time maritime crisis operations command center for the Strait of Hormuz. 15 vessels, live simulation, AI-powered distress analysis.

## Initial Setup
- Node.js 20+
- Backend: Express + WebSockets (port 4000)
- Frontend: Next.js 15 + Leaflet (port 3000)

- Distress analyzer includes local heuristic fallback when Anthropic API is unreachable.
- Restricted zone geofencing with polygon drawing tools.
- Dynamic zone removal with auto path recalculation.
