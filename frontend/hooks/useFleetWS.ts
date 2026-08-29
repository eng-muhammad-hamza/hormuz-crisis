'use client';

import { useEffect, useRef, useCallback, startTransition } from 'react';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import type { WSMessage } from '@/types';
import { playSound as engineSound, startSiren, stopSiren } from '@/lib/audio';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

export function useFleetWS() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount = useRef(0);

  const {
    setWs,
    setConnected,
    setSessionId,
    setClientCount,
    setFleet,
    setHistory,
    setEventLog,
    addAlert,
    updateAlert,
    addDirective,
    updateDirective,
    addDistress,
    updateDistress,
    addZone,
    removeZone,
    addAssistanceRequest,
    updateAssistanceRequest,
    soundEnabled,
  } = useStore(
    useShallow((s) => ({
      setWs: s.setWs,
      setConnected: s.setConnected,
      setSessionId: s.setSessionId,
      setClientCount: s.setClientCount,
      setFleet: s.setFleet,
      setHistory: s.setHistory,
      setEventLog: s.setEventLog,
      addAlert: s.addAlert,
      updateAlert: s.updateAlert,
      addDirective: s.addDirective,
      updateDirective: s.updateDirective,
      addDistress: s.addDistress,
      updateDistress: s.updateDistress,
      addZone: s.addZone,
      removeZone: s.removeZone,
      addAssistanceRequest: s.addAssistanceRequest,
      updateAssistanceRequest: s.updateAssistanceRequest,
      soundEnabled: s.soundEnabled,
    }))
  );

  const playSound = useCallback(
    (type: 'alert' | 'distress' | 'arrival' | 'warning') => {
      if (!soundEnabled) return;
      engineSound(type);
    },
    [soundEnabled]
  );

  // Keep continuous siren in sync with critical alerts
  const hasCriticalAlert = useStore(
    (s) =>
      !!s.fleet?.alerts.some(
        (a) => a.severity === 'critical' && !a.acknowledged
      )
  );

  useEffect(() => {
    if (!soundEnabled) {
      stopSiren();
      return;
    }
    if (hasCriticalAlert) startSiren();
    else stopSiren();
  }, [hasCriticalAlert, soundEnabled]);

  useEffect(() => () => stopSiren(), []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    setWs(ws);

    ws.onopen = () => {
      setConnected(true);
      reconnectCount.current = 0;
    };

    ws.onmessage = (event) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'init': {
          const { sessionId, state, history, eventLog } = msg.data as {
            sessionId: string;
            state: Parameters<typeof setFleet>[0];
            history: Parameters<typeof setHistory>[0];
            eventLog: Parameters<typeof setEventLog>[0];
          };
          startTransition(() => {
            setSessionId(sessionId);
            setFleet(state);
            setHistory(history);
            setEventLog(eventLog);
          });
          break;
        }

        case 'fleet_update':
          startTransition(() => {
            setFleet(msg.data as Parameters<typeof setFleet>[0]);
          });
          break;

        case 'alert': {
          const alert = msg.data as Parameters<typeof addAlert>[0];
          startTransition(() => {
            addAlert(alert);
          });
          if (alert.severity === 'critical') playSound('alert');
          if (alert.type === 'DISTRESS') playSound('distress');
          if (alert.type === 'ARRIVED') playSound('arrival');
          if (alert.severity === 'warning') playSound('warning');
          break;
        }

        case 'alert_update':
          startTransition(() => {
            updateAlert(msg.data as Parameters<typeof updateAlert>[0]);
          });
          break;

        case 'directive':
        case 'directive_received':
          startTransition(() => {
            addDirective(msg.data as Parameters<typeof addDirective>[0]);
          });
          break;

        case 'directive_response':
          startTransition(() => {
            updateDirective(msg.data as Parameters<typeof updateDirective>[0]);
          });
          break;

        case 'distress':
          startTransition(() => {
            addDistress(msg.data as Parameters<typeof addDistress>[0]);
          });
          playSound('distress');
          break;

        case 'distress_update':
          startTransition(() => {
            updateDistress(msg.data as Parameters<typeof updateDistress>[0]);
          });
          break;

        case 'zone_update': {
          const { action, zone, zoneId } = msg.data as {
            action: string;
            zone?: Parameters<typeof addZone>[0];
            zoneId?: string;
          };
          startTransition(() => {
            if (action === 'add' && zone) addZone(zone);
            if (action === 'remove' && zoneId) removeZone(zoneId);
          });
          break;
        }

        case 'assistance_request':
          startTransition(() => {
            addAssistanceRequest(
              msg.data as Parameters<typeof addAssistanceRequest>[0]
            );
          });
          playSound('warning');
          break;

        case 'assistance_response':
          startTransition(() => {
            updateAssistanceRequest(
              msg.data as Parameters<typeof updateAssistanceRequest>[0]
            );
          });
          break;

        case 'client_count':
          setClientCount((msg.data as { count: number }).count);
          break;

        case 'history':
          startTransition(() => {
            setHistory(msg.data as Parameters<typeof setHistory>[0]);
          });
          break;

        case 'event_log':
          startTransition(() => {
            setEventLog(msg.data as Parameters<typeof setEventLog>[0]);
          });
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setWs(null);
      wsRef.current = null;
      const delay = Math.min(1000 * 2 ** reconnectCount.current, 30000);
      reconnectCount.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [
    setWs,
    setConnected,
    setSessionId,
    setFleet,
    setHistory,
    setEventLog,
    addAlert,
    updateAlert,
    addDirective,
    updateDirective,
    addDistress,
    updateDistress,
    addZone,
    removeZone,
    addAssistanceRequest,
    updateAssistanceRequest,
    setClientCount,
    playSound,
  ]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback(
    (type: string, data: Record<string, unknown> = {}) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, ...data }));
      }
    },
    []
  );

  return { send, playSound };
}
