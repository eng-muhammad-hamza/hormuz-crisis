import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  FleetState,
  Ship,
  Alert,
  Directive,
  DistressMessage,
  RestrictedZone,
  HistorySnapshot,
  EventLogEntry,
  UserRole,
  ThemeMode,
  AssistanceRequest,
} from '@/types';

export type PanelKey =
  | 'alerts'
  | 'distress'
  | 'directives'
  | 'analytics'
  | 'predictive'
  | 'advisor'
  | 'assistance'
  | 'admin'
  | null;

interface AppStore {
  // Connection
  ws: WebSocket | null;
  connected: boolean;
  sessionId: string | null;
  clientCount: number;

  // Auth / identity (persisted)
  role: UserRole;
  captainShipId: string | null;
  operatorName: string;

  // Fleet state
  fleet: FleetState | null;
  selectedShipId: string | null;

  // History & events
  history: HistorySnapshot[];
  eventLog: EventLogEntry[];
  playbackIndex: number | null;

  // UI — single source of truth for the one open side panel
  theme: ThemeMode;
  activePanel: PanelKey;
  sidebarCollapsed: boolean;
  drawingZone: boolean;
  pickingWaypointFor: string | null;
  soundEnabled: boolean;

  // Derived convenience flags
  alertsOpen: boolean;
  distressOpen: boolean;
  directivesOpen: boolean;
  analyticsOpen: boolean;

  // Actions
  setWs: (ws: WebSocket | null) => void;
  setConnected: (v: boolean) => void;
  setSessionId: (id: string) => void;
  setClientCount: (n: number) => void;
  setRole: (role: UserRole, shipId?: string | null) => void;
  setOperatorName: (name: string) => void;
  setFleet: (state: FleetState) => void;
  updateShip: (ship: Ship) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (alert: Alert) => void;
  addDirective: (d: Directive) => void;
  updateDirective: (d: Directive) => void;
  addDistress: (d: DistressMessage) => void;
  updateDistress: (d: DistressMessage) => void;
  addAssistanceRequest: (r: AssistanceRequest) => void;
  updateAssistanceRequest: (r: AssistanceRequest) => void;
  addZone: (z: RestrictedZone) => void;
  removeZone: (id: string) => void;
  setHistory: (h: HistorySnapshot[]) => void;
  setEventLog: (log: EventLogEntry[]) => void;
  setPlaybackIndex: (
    i: number | null | ((prev: number | null) => number | null)
  ) => void;
  selectShip: (id: string | null) => void;
  setTheme: (t: ThemeMode) => void;
  openPanel: (p: PanelKey) => void;
  closePanel: () => void;
  togglePanel: (p: PanelKey) => void;
  toggleAlerts: () => void;
  toggleDistress: () => void;
  toggleDirectives: () => void;
  toggleAnalytics: () => void;
  toggleSidebar: () => void;
  setDrawingZone: (v: boolean) => void;
  setPickingWaypointFor: (shipId: string | null) => void;
  setSoundEnabled: (v: boolean) => void;

  send: (type: string, data: Record<string, unknown>) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ws: null,
      connected: false,
      sessionId: null,
      clientCount: 0,
      role: 'observer',
      captainShipId: null,
      operatorName: '',
      fleet: null,
      selectedShipId: null,
      history: [],
      eventLog: [],
      playbackIndex: null,
      theme: 'dark',
      activePanel: null,
      sidebarCollapsed: false,
      drawingZone: false,
      pickingWaypointFor: null,
      soundEnabled: true,
      alertsOpen: false,
      distressOpen: false,
      directivesOpen: false,
      analyticsOpen: false,

      setWs: (ws) => set({ ws }),
      setConnected: (connected) => set({ connected }),
      setSessionId: (sessionId) => set({ sessionId }),
      setClientCount: (clientCount) => set({ clientCount }),
      setRole: (role, shipId = null) => set({ role, captainShipId: shipId }),
      setOperatorName: (operatorName) => set({ operatorName }),

      setFleet: (fleet) => set({ fleet }),

      updateShip: (ship) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              ships: s.fleet.ships.map((sh) =>
                sh.shipId === ship.shipId ? ship : sh
              ),
            },
          };
        }),

      addAlert: (alert) =>
        set((s) => {
          if (!s.fleet) return {};
          if (s.fleet.alerts.find((a) => a.id === alert.id)) return {};
          return {
            fleet: {
              ...s.fleet,
              alerts: [alert, ...s.fleet.alerts].slice(0, 200),
            },
          };
        }),

      updateAlert: (alert) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              alerts: s.fleet.alerts
                .map((a) => (a.id === alert.id ? alert : a))
                .filter((a) => !a.acknowledged),
            },
          };
        }),

      addDirective: (d) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              directives: [d, ...s.fleet.directives].slice(0, 100),
            },
          };
        }),

      updateDirective: (d) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              directives: s.fleet.directives.map((x) =>
                x.id === d.id ? d : x
              ),
            },
          };
        }),

      addDistress: (d) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              distressMessages: [d, ...s.fleet.distressMessages].slice(0, 50),
            },
          };
        }),

      updateDistress: (d) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              distressMessages: s.fleet.distressMessages.map((x) =>
                x.id === d.id ? d : x
              ),
            },
          };
        }),

      addAssistanceRequest: (r) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              assistanceRequests: [
                r,
                ...(s.fleet.assistanceRequests || []),
              ].slice(0, 50),
            },
          };
        }),

      updateAssistanceRequest: (r) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              assistanceRequests: (s.fleet.assistanceRequests || []).map((x) =>
                x.id === r.id ? r : x
              ),
            },
          };
        }),

      addZone: (z) =>
        set((s) => {
          if (!s.fleet) return {};
          if (s.fleet.zones.find((x) => x.id === z.id)) return {};
          return { fleet: { ...s.fleet, zones: [...s.fleet.zones, z] } };
        }),

      removeZone: (id) =>
        set((s) => {
          if (!s.fleet) return {};
          return {
            fleet: {
              ...s.fleet,
              zones: s.fleet.zones.filter((z) => z.id !== id),
            },
          };
        }),

      setHistory: (history) => set({ history }),
      setEventLog: (eventLog) => set({ eventLog }),
      setPlaybackIndex: (i) =>
        set((s) => ({
          playbackIndex:
            typeof i === 'function' ? i(s.playbackIndex) : i,
        })),

      // Single active right-hand panel rule:
      // Selecting a ship automatically closes any utility panel.
      selectShip: (selectedShipId) =>
        set({
          selectedShipId,
          activePanel: selectedShipId ? null : get().activePanel,
          alertsOpen: false,
          distressOpen: false,
          directivesOpen: false,
          analyticsOpen: false,
        }),

      setTheme: (theme) => set({ theme }),

      // Opening a utility panel automatically deselects ship so they never overlap
      openPanel: (p) =>
        set({
          activePanel: p,
          selectedShipId: p ? null : get().selectedShipId,
          alertsOpen: p === 'alerts',
          distressOpen: p === 'distress',
          directivesOpen: p === 'directives',
          analyticsOpen: p === 'analytics',
        }),

      closePanel: () =>
        set({
          activePanel: null,
          selectedShipId: null,
          alertsOpen: false,
          distressOpen: false,
          directivesOpen: false,
          analyticsOpen: false,
        }),

      togglePanel: (p) =>
        set((s) => {
          const next = s.activePanel === p ? null : p;
          return {
            activePanel: next,
            selectedShipId: next ? null : s.selectedShipId,
            alertsOpen: next === 'alerts',
            distressOpen: next === 'distress',
            directivesOpen: next === 'directives',
            analyticsOpen: next === 'analytics',
          };
        }),

      toggleAlerts: () => get().togglePanel('alerts'),
      toggleDistress: () => get().togglePanel('distress'),
      toggleDirectives: () => get().togglePanel('directives'),
      toggleAnalytics: () => get().togglePanel('analytics'),

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setDrawingZone: (drawingZone) => set({ drawingZone }),
      setPickingWaypointFor: (pickingWaypointFor) =>
        set({ pickingWaypointFor }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      send: (type, data) => {
        const { ws } = get();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type, ...data }));
        }
      },
    }),
    {
      name: 'hormuz-c2-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        role: state.role,
        operatorName: state.operatorName,
        soundEnabled: state.soundEnabled,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
