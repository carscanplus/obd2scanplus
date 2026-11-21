import { BleManager } from "react-native-ble-plx";

/**
 * Instancia singleton única de BleManager para toda la aplicación.
 *
 * La documentación de react-native-ble-plx y Android BluetoothGatt exigen
 * una única instancia. Crear múltiples instancias provoca corrupción interna
 * del stack nativo (GATT 133 / Device or resource busy), bloqueando
 * reconexiones posteriores al mismo dispositivo.
 */
let sharedBleManager: BleManager | null = null;

export function getBleManager(): BleManager {
  if (!sharedBleManager) {
    sharedBleManager = new BleManager();
  }
  return sharedBleManager;
}

export async function stopAnyBleScan(): Promise<void> {
  if (sharedBleManager) {
    try {
      await sharedBleManager.stopDeviceScan();
    } catch {
      // ignorar si no estaba escaneando
    }
  }
}
