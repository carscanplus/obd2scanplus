import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import RNBluetoothClassic from "react-native-bluetooth-classic";

export interface DiscoveredDevice {
  id: string;
  name: string;
  kind: "spp" | "ble";
}

/** Nombres habituales de adaptadores OBD-II (V011 incluido). */
const OBD_NAME_HINTS =
  /v011|obd|elm|vlink|vgate|veepeak|konnwei|icar|keboda|autel|scan|minidiag|maxiscan/i;

/** `true` si el nombre parece un adaptador OBD-II; sirve para ordenar la lista. */
export function isObdLikeDevice(name: string): boolean {
  return OBD_NAME_HINTS.test(name);
}

function isGranted(status: string | undefined): boolean {
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Android 12+ exige BLUETOOTH_SCAN/CONNECT en runtime. El descubrimiento
 * clásico también necesita ubicación precisa, incluso en Android 14.
 */
export async function requestClassicBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: "Ubicación para buscar Bluetooth",
      message:
        "Android exige ubicación precisa para descubrir dispositivos Bluetooth clásicos cercanos, como el adaptador OBD2.",
      buttonPositive: "Permitir",
      buttonNegative: "Cancelar",
    },
  );
  if (!isGranted(fine)) return false;

  if (Number(Platform.Version) < 31) return true;

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);

  return (
    isGranted(results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]) &&
    isGranted(results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT])
  );
}

export async function ensureClassicBluetoothReady(): Promise<void> {
  const granted = await requestClassicBluetoothPermissions();
  if (!granted) {
    throw new Error(
      "Se necesitan permisos de Bluetooth y ubicación para listar y buscar dispositivos.",
    );
  }

  const enabled = await isBluetoothEnabled();
  if (enabled) return;

  const turnedOn = await requestBluetoothEnabled();
  if (!turnedOn) {
    throw new Error("Activa Bluetooth para buscar adaptadores OBD2.");
  }
}

/**
 * Permisos necesarios para escanear BLE.
 *
 * En Android 12+ basta con BLUETOOTH_SCAN/CONNECT; la ubicación sólo hace falta
 * en versiones anteriores. Pedirla de más hacía que un usuario que la denegara
 * no pudiera ni siquiera escanear adaptadores BLE.
 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  if (Number(Platform.Version) < 31) {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Ubicación para buscar dispositivos Bluetooth",
        message:
          "Android exige ubicación precisa para descubrir dispositivos Bluetooth cercanos, como el adaptador OBD2.",
        buttonPositive: "Permitir",
        buttonNegative: "Cancelar",
      },
    );
    return isGranted(fine);
  }

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);

  return (
    isGranted(results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]) &&
    isGranted(results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT])
  );
}

function toSppDevice(device: {
  address?: string;
  name?: string;
}): DiscoveredDevice | null {
  if (!device.address) return null;
  return {
    id: device.address,
    name: device.name || device.address,
    kind: "spp",
  };
}

/** Lista los dispositivos Bluetooth Clásico (SPP) ya vinculados (Android). */
export async function listSppDevices(): Promise<DiscoveredDevice[]> {
  await ensureClassicBluetoothReady();
  const devices = await RNBluetoothClassic.getBondedDevices();
  return devices
    .filter((d) => d.type !== "LOW_ENERGY")
    .map((d) => ({
      id: d.address,
      name: d.name || d.address,
      kind: "spp" as const,
    }));
}

export async function isBluetoothEnabled(): Promise<boolean> {
  try {
    return await RNBluetoothClassic.isBluetoothEnabled();
  } catch {
    return false;
  }
}

export async function requestBluetoothEnabled(): Promise<boolean> {
  try {
    return await RNBluetoothClassic.requestBluetoothEnabled();
  } catch {
    return false;
  }
}

/**
 * Escanea dispositivos BLE durante `scanSeconds` y llama `onDevice` por cada
 * dispositivo encontrado (una sola vez por ID). Incluye dispositivos sin nombre.
 */
export function scanBleDevices(
  onDevice: (device: DiscoveredDevice) => void,
  scanSeconds = 5,
  onError?: (message: string) => void,
): { stop: () => void } {
  const manager = new BleManager();
  const seen = new Set<string>();
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stopScan = () => {
    finished = true;
    if (timer) clearTimeout(timer);
    void manager.stopDeviceScan();
  };

  const fail = (message: string) => {
    stopScan();
    onError?.(message);
  };

  void requestBlePermissions().then((granted) => {
    if (finished) return;
    if (!granted) {
      fail("Se necesitan permisos de Bluetooth para escanear dispositivos BLE.");
      return;
    }

    try {
      manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device: Device | null) => {
          if (error) {
            if (!finished) fail(error.message || "No se pudo escanear BLE.");
            return;
          }
          if (finished || !device?.id) return;
          if (seen.has(device.id)) return;
          seen.add(device.id);
          const name = device.name ?? device.localName ?? device.id;
          onDevice({ id: device.id, name, kind: "ble" });
        },
      );
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
      return;
    }

    timer = setTimeout(stopScan, scanSeconds * 1000);
  });

  return { stop: stopScan };
}

let classicDiscoveryActive = false;

export function cancelClassicDiscovery(): void {
  classicDiscoveryActive = false;
  void RNBluetoothClassic.cancelDiscovery().catch(() => {});
}

/**
 * Inicia un descubrimiento de dispositivos Bluetooth Clásico (Android) y
 * notifica los encontrados. Usa el resultado de `startDiscovery()` porque
 * los eventos nativos no siempre llegan en la New Architecture.
 */
export async function startClassicDiscovery(
  onDevice: (device: DiscoveredDevice) => void,
): Promise<DiscoveredDevice[]> {
  if (Platform.OS !== "android") {
    throw new Error("Bluetooth clásico solo está disponible en Android.");
  }

  await ensureClassicBluetoothReady();

  if (classicDiscoveryActive) {
    await RNBluetoothClassic.cancelDiscovery().catch(() => {});
  }
  classicDiscoveryActive = true;

  const found = new Map<string, DiscoveredDevice>();
  const emit = (device: DiscoveredDevice | null) => {
    if (!device || found.has(device.id)) return;
    found.set(device.id, device);
    onDevice(device);
  };

  const subscription = RNBluetoothClassic.onDeviceDiscovered((event) => {
    const payload = event as {
      device?: { address?: string; name?: string };
      address?: string;
      name?: string;
    };
    emit(toSppDevice(payload.device ?? payload));
  });

  try {
    await RNBluetoothClassic.cancelDiscovery().catch(() => {});
    const discovered = await RNBluetoothClassic.startDiscovery();
    for (const device of discovered) {
      emit(toSppDevice(device));
    }
    return [...found.values()];
  } finally {
    classicDiscoveryActive = false;
    subscription.remove();
  }
}
