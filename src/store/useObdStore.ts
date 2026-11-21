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
  isDemoMode: boolean;

  connectSpp: (address: string, name: string) => Promise<void>;
  connectBle: (id: string, name: string) => Promise<void>;
  startDemoMode: () => void;
  stopDemoMode: () => void;
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
  let demoTimer: ReturnType<typeof setInterval> | null = null;
  let demoStep = 0;
  let busy = false;

  function stopDemo(): void {
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
    }
  }

  function connectedMessage(session: ObdSession, name: string): string {
    const info = [session.elmVersionName, session.protocol]
      .filter(Boolean)
      .join(" · ");
    return info ? `Conectado a ${name} (${info})` : `Conectado a ${name}`;
  }

  function startSession(session: ObdSession, name: string): void {
    stopDemo();
    set({
      status: "connected",
      isDemoMode: false,
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
    let consecutiveErrors = 0;
    pollTimer = setInterval(async () => {
      const state = get();
      if (!state.session.connected || state.paused || busy) return;

      busy = true;
      try {
        const pids = dashboardPids(state.session);
        const pid = pids[index % pids.length];
        index += 1;

        const response = await state.session.query(Command.newPid(pid.command));
        consecutiveErrors = 0;
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
        consecutiveErrors += 1;
        // Si hay varios fallos seguidos y el adaptador ya no responde
        if (consecutiveErrors >= 4) {
          stopPolling();
          state.session.disconnect();
          set({
            status: "error",
            connectionMessage: "Se perdió la conexión con el adaptador OBD2.",
          });
        }
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
    isDemoMode: false,

    startDemoMode: () => {
      get().disconnect();
      set({
        status: "connected",
        isDemoMode: true,
        connectionName: "Simulador Cockpit",
        connectionMessage: "⚡ MODO DEMO: Simulación en tiempo real activa",
        live: {},
        dtcs: [],
      });

      demoStep = 0;
      demoTimer = setInterval(() => {
        const state = get();
        if (state.paused) return;

        demoStep += 1;
        const t = demoStep * 0.15;

        // Simulación de aceleraciones y cambios de marcha suaves
        const cycle = Math.sin(t);
        const rpmBase = 900 + Math.abs(cycle) * 3200 + (demoStep % 7) * 40;
        const rpm = Math.round(rpmBase);
        const speed = Math.max(0, Math.round(Math.abs(cycle) * 88));
        const load = Math.round(18 + Math.abs(cycle) * 45);
        const throttle = Math.round(12 + Math.abs(cycle) * 40);
        const coolant = Math.round(88 + Math.sin(t * 0.2) * 3);
        const voltage = Math.round((14.0 + Math.sin(t * 0.4) * 0.3) * 10) / 10;
        const maf = Math.round((rpm / 200) * 1.6 * 10) / 10;
        const fuel = 68;

        set({
          live: {
            "Engine Speed": { name: "Engine Speed", value: rpm, unit: "RPM" },
            "Vehicle Speed": { name: "Vehicle Speed", value: speed, unit: "km/h" },
            "Coolant Temp.": { name: "Coolant Temp.", value: coolant, unit: "°C" },
            "Engine Load": { name: "Engine Load", value: load, unit: "%" },
            "Throttle Pos.": { name: "Throttle Pos.", value: throttle, unit: "%" },
            "Control Module Voltage": { name: "Control Module Voltage", value: voltage, unit: "V" },
            "MAF Airflow Rate": { name: "MAF Airflow Rate", value: maf, unit: "g/s" },
            "Fuel Level Input": { name: "Fuel Level Input", value: fuel, unit: "%" },
          },
        });
      }, 350);
    },

    stopDemoMode: () => {
      stopDemo();
      set({
        status: "disconnected",
        isDemoMode: false,
        connectionName: "Ninguno",
        connectionMessage: "Sin conexión",
        live: {},
        dtcs: [],
      });
    },

    connectSpp: async (address, name) => {
      // 1. Limpieza rigurosa de cualquier sesión previa
      get().disconnect();
      await new Promise((r) => setTimeout(r, 250));

      const session = new ObdSession();
      session.onDisconnected = () => {
        stopPolling();
        set({
          status: "disconnected",
          connectionMessage: `El adaptador ${name} se ha desconectado.`,
        });
      };

      set({
        session,
        status: "connecting",
        connectionMessage: `Conectando a ${name}...`,
      });
      try {
        await session.connect(new SppTransport(address, name), 0);
        startSession(session, name);
      } catch (error) {
        session.disconnect();
        set({ status: "error", connectionMessage: errorMessage(error) });
      }
    },

    connectBle: async (id, name) => {
      // 1. Limpieza rigurosa de cualquier sesión previa
      get().disconnect();
      await new Promise((r) => setTimeout(r, 250));

      const session = new ObdSession();
      session.onDisconnected = () => {
        stopPolling();
        set({
          status: "disconnected",
          connectionMessage: `El adaptador ${name} se ha desconectado.`,
        });
      };

      set({
        session,
        status: "connecting",
        connectionMessage: `Conectando (BLE) a ${name}...`,
      });
      try {
        await session.connect(new BleTransport(id, name), 0);
        startSession(session, name);
      } catch (error) {
        session.disconnect();
        set({ status: "error", connectionMessage: errorMessage(error) });
      }
    },

    disconnect: () => {
      stopPolling();
      stopDemo();
      get().session.disconnect();
      set({
        status: "disconnected",
        isDemoMode: false,
        connectionMessage: "Sin conexión",
        connectionName: "Ninguno",
        live: {},
        dtcs: [],
        paused: false,
      });
    },

    scanDtcs: async () => {
      set({ scanning: true });
      if (get().isDemoMode) {
        await new Promise((r) => setTimeout(r, 1000));
        set({
          dtcs: [
            {
              code: "P0420",
              category: "Powertrain",
              description: "Eficiencia del sistema catalizador por debajo del umbral (Banco 1)",
              permanent: false,
            },
            {
              code: "P0171",
              category: "Powertrain",
              description: "Sistema de inyección demasiado pobre (Banco 1)",
              permanent: true,
            },
          ],
          scanning: false,
        });
        return;
      }

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
      if (get().isDemoMode) {
        set({ dtcs: [], connectionMessage: "Códigos borrados exitosamente (Modo Demo)" });
        return;
      }

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
