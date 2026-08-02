export type ShipStatus =
  | 'normal'
  | 'rerouting'
  | 'distressed'
  | 'stopped'
  | 'stranded'
  | 'arrived'
  | 'out_of_fuel'
  | 'insufficient_fuel'
  | 'assisting';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';
export type AlertType =
  | 'GEOFENCE_BREACH'
  | 'PROXIMITY'
  | 'DISTRESS'
  | 'FUEL_LOW'
  | 'OUT_OF_FUEL'
  | 'STRANDED'
  | 'ARRIVED'
  | 'PREDICTIVE_ZONE'
  | 'PREDICTIVE_FUEL'
  | 'SYSTEM';

export interface Ship {
  shipId: string;
  name: string;
  position: [number, number];
  prevPosition: [number, number];
  speed: number;
  heading: number;
  destination: string;
  fuel: number;
  fuelCapacity: number;
  cargo: string;
  status: ShipStatus;
  path: [number, number][];
  pathIndex: number;
  distanceToDestination: number;
  arrived: boolean;
  distressMessages: DistressMessage[];
  inWeather: boolean;
  currentWeather: WeatherZone | null;
  predictedFuelShortfall: boolean;
  eta: string | null;
  totalDistanceTraveled: number;
  assignedCaptain: string | null;
  defaultCaptainName: string;
  crewCount: number;
  operatorSessionId: string | null;
  customWaypoint: [number, number] | null;
  inspectionRequested: boolean;
  assistTarget?: string;
}

export interface Port {
  id: string;
  name: string;
  position: [number, number];
}

export interface RestrictedZone {
  id: string;
  name: string;
  polygon: [number, number][];
  active: boolean;
  createdAt: string;
  color?: string;
  reason?: string;
}

export interface WeatherZone {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  intensity: 'light' | 'moderate' | 'severe';
  windSpeed: number;
  visibility: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  shipId: string | null;
  zoneId: string | null;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export interface Directive {
  id: string;
  shipId: string;
  type: 'REROUTE' | 'HOLD' | 'RESUME' | 'SPEED_CHANGE' | 'ASSIST' | 'WAYPOINT' | 'INSPECT';
  params: Record<string, unknown>;
  issuedBy: string;
  issuedAt: string;
  status: 'pending' | 'ACCEPTED' | 'ESCALATED';
  response: string | null;
  respondedAt?: string;
}

export interface Operator {
  name: string | null;
  role: UserRole;
  shipId: string | null;
  connectedAt: string;
}

export interface AssistanceRequest {
  id: string;
  fromShipId: string;
  toShipId: string;
  fromShipName: string;
  toShipName: string;
  type: 'fuel_transfer' | 'medical' | 'escort' | 'cargo_offload';
  status: 'pending' | 'accepted' | 'declined';
  timestamp: string;
  respondedAt?: string;
  responseMessage?: string;
}

export interface DistressMessage {
  id: string;
  shipId: string;
  shipName: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  extractedData: DistressAnalysis | null;
  status: 'processing' | 'analyzed';
}

export interface DistressAnalysis {
  severity: 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  injuryCount: number;
  damageEstimate: number;
  requiresImmediateAction: boolean;
  recommendedAction: string;
  confidence: number;
}

export interface FleetState {
  ships: Ship[];
  ports: Port[];
  zones: RestrictedZone[];
  alerts: Alert[];
  allAlerts: Alert[];
  directives: Directive[];
  distressMessages: DistressMessage[];
  assistanceRequests: AssistanceRequest[];
  operators: Operator[];
  weatherZones: WeatherZone[];
  tickCount: number;
  simTimeMultiplier?: number;
  timestamp: string;
}

export interface HistorySnapshot {
  timestamp: string;
  ships: {
    shipId: string;
    position: [number, number];
    status: ShipStatus;
    fuel: number;
    heading: number;
    speed: number;
  }[];
  alertCount: number;
}

export interface EventLogEntry {
  id: string;
  entityId: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
}

export type UserRole = 'command' | 'captain' | 'observer' | 'admin';
export type ThemeMode = 'dark' | 'light';

export interface WSMessage {
  type: string;
  data: unknown;
  timestamp: string;
}
