import { create } from "zustand";

import { Command } from "../obd/command";
import { TRACKED_PIDS } from "../obd/dashboard";
import { lookupDtcDescription } from "../obd/descriptions";
import { TroubleCode } from "../obd/dtc";
import { computeScalar, PidDefinition } from "../obd/pids";
import { ObdSession } from "../obd/session";
import { BleTransport } from "../transport/ble";
import { SppTransport } from "../transport/spp";

/** Cada cuánto se consulta el siguiente PID del dashboard. */
const POLL_INTERVAL_MS = 1000;

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface LiveValue {
  name: string;
  value: number;
  unit: string;
}

interface ObdState {
  session: ObdSession;
  status: ConnectionStatus;
  connectionMessage: string;
  connectionName: string;
  live: Record<string, LiveValue>;
  dtcs: TroubleCode[];
  paused: boolean;
  scanning: boolean;

  connectSpp: (address: string, name: string) => Promise<void>;
  connectBle: (id: string, name: string) => Promise<void>;
  disconnect: () => void;
  scanDtcs: () => Promise<void>;
  clearDtcs: () => Promise<void>;
  setPaused: (paused: boolean) => void;
  clearDashboard: () => void;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/read failed|socket might closed|read ret: -1/i.test(message)) {
    return "El adaptador Bluetooth cerró la conexión. Comprueba que esté encendido, vinculado y conectado al vehículo; luego vuelve a intentarlo.";
  }
  if (/espera|timeout/i.test(message)) {
    return "El adaptador no respondió. Comprueba que la llave esté en posición ON (cuadro encendido) y vuelve a conectarte.";
  }
  if (/powered off|not powered|bluetooth.*off|bluetooth is off/i.test(message)) {
    return "Activa el Bluetooth del teléfono e inténtalo de nuevo.";
  }
  return message;
}

/**
 * PIDs del dashboard. Si el vehículo ya informó qué PIDs soporta se filtran
 * para no gastar peticiones en los que devolverán "NO DATA".
 */
function dashboardPids(session: ObdSession): PidDefinition[] {
  const supported = session.supportedPidCommands;
  if (!supported) return TRACKED_PIDS;
  const filtered = TRACKED_PIDS.filter((pid) => supported.has(pid.command));
  return filtered.length > 0 ? filtered : TRACKED_PIDS;
}

export const useObdStore = create<ObdState>((set, get) => {
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let busy = false;

  function connectedMessage(session: ObdSession, name: string): string {
    const info = [session.elmVersionName, session.protocol]
      .filter(Boolean)
      .join(" · ");
    return info ? `Conectado a ${name} (${info})` : `Conectado a ${name}`;
  }

  function startSession(session: ObdSession, name: string): void {
    set({
      status: "connected",
      connectionName: name,
      connectionMessage: connectedMessage(session, name),
      live: {},
    });
    startPolling();
    // Best-effort: filtra el sondeo a los PIDs que el vehículo soporta.
    void session.loadSupportedPids().catch(() => {});
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPolling(): void {
    stopPolling();
    busy = false;

    let index = 0;
    pollTimer = setInterval(async () => {
      const state = get();
      if (!state.session.connected || state.paused || busy) return;

      busy = true;
      try {
        const pids = dashboardPids(state.session);
        const pid = pids[index % pids.length];
        index += 1;

        const response = await state.session.query(Command.newPid(pid.command));
        const scalar = computeScalar(
          pid,
          response,
          state.session.unitPreferences,
        );
        if (scalar.isNoData) return;

        set((s) => ({
          live: {
            ...s.live,
            [pid.name]: {
              name: pid.name,
              value: scalar.value,
              unit: scalar.label,
            },
          },
        }));
      } catch {
        // ignorar errores puntuales de lectura
      } finally {
        busy = false;
      }
    }, POLL_INTERVAL_MS);
  }

  return {
    session: new ObdSession(),
    status: "disconnected",
    connectionMessage: "Sin conexión",
    connectionName: "Ninguno",
    live: {},
    dtcs: [],
    paused: false,
    scanning: false,

    connectSpp: async (address, name) => {
      const session = new ObdSession();
      set({
        session,
        status: "connecting",
        connectionMessage: "Conectando...",
      });
      try {
        await session.connect(new SppTransport(address, name), 0);
        startSession(session, name);
      } catch (error) {
        set({ status: "error", connectionMessage: errorMessage(error) });
      }
    },

    connectBle: async (id, name) => {
      const session = new ObdSession();
      set({
        session,
        status: "connecting",
        connectionMessage: "Conectando (BLE)...",
      });
      try {
        await session.connect(new BleTransport(id, name), 0);
        startSession(session, name);
      } catch (error) {
        set({ status: "error", connectionMessage: errorMessage(error) });
      }
    },

    disconnect: () => {
      stopPolling();
      get().session.disconnect();
      set({
        status: "disconnected",
        connectionMessage: "Sin conexión",
        connectionName: "Ninguno",
        live: {},
        dtcs: [],
        paused: false,
      });
    },

    scanDtcs: async () => {
      set({ scanning: true });
      try {
        const state = get();
        const [codes, permanent] = await Promise.all([
          state.session.getTroubleCodes(lookupDtcDescription),
          state.session.getPermanentTroubleCodes(lookupDtcDescription),
        ]);
        set({ dtcs: [...codes, ...permanent], scanning: false });
      } catch (error) {
        set({ scanning: false, connectionMessage: errorMessage(error) });
      }
    },

    clearDtcs: async () => {
      try {
        const cleared = await get().session.clearTroubleCodes();
        if (!cleared) {
          set({
            connectionMessage:
              "El adaptador no confirmó el borrado de los códigos de falla.",
          });
          return;
        }
        set({ dtcs: [] });
      } catch (error) {
        set({ connectionMessage: errorMessage(error) });
      }
    },

    setPaused: (paused) => set({ paused }),

    clearDashboard: () => set({ live: {} }),
  };
});
