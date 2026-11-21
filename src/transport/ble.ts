import { Platform } from "react-native";
import {
    BleManager,
    Characteristic,
    Device,
    Subscription,
} from "react-native-ble-plx";

import { OBDTransport } from "../obd/transport";
import { base64ToUtf8, utf8ToBase64 } from "./base64";
import { ReadBuffer } from "./readBuffer";

/**
 * Perfil del adaptador OBD-II BLE "V011" (clon ELM327 v2.2), verificado:
 *   - Servicio 0xFFE0
 *   - 0xFFE1: notificaciones (respuestas del adaptador)
 *   - 0xFFE2: escritura (comandos, sin respuesta)
 */
export const ELM327_BLE = {
  service: "0000ffe0-0000-1000-8000-00805f9b34fb",
  notify: "0000ffe1-0000-1000-8000-00805f9b34fb",
  write: "0000ffe2-0000-1000-8000-00805f9b34fb",
};

/** Perfiles serie usados por adaptadores ELM327 BLE habituales. */
const KNOWN_PROFILES = [
  { service: "ffe0", notify: "ffe1", write: "ffe2" }, // V011 y clones ELM327
  { service: "ffe0", notify: "ffe1", write: "ffe1" }, // HM-10 (una sola característica)
  { service: "fff0", notify: "fff1", write: "fff2" }, // BT05/CC2541
];

/** Margen para que el stack active el descriptor CCCD de notificaciones. */
const NOTIFY_SETTLE_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** UUID corto (4 hex) de un UUID Bluetooth SIG de 128 bits. */
export function shortUuid(uuid: string): string {
  const lower = uuid.toLowerCase();
  const match = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/.exec(lower);
  return match ? match[1] : lower;
}

function isNotifiable(characteristic: Characteristic): boolean {
  return characteristic.isNotifiable || characteristic.isIndicatable;
}

function isWritable(characteristic: Characteristic): boolean {
  return (
    characteristic.isWritableWithResponse ||
    characteristic.isWritableWithoutResponse
  );
}

export interface BleTransportOptions {
  serviceUuid?: string;
  notifyUuid?: string;
  writeUuid?: string;
  /** Tiempo máximo de espera del prompt `>` en milisegundos. */
  readTimeoutMs?: number;
}

interface ServiceInventory {
  uuid: string;
  characteristics: Characteristic[];
}

/**
 * Transporte Bluetooth Low Energy (BLE) usando `react-native-ble-plx`.
 * Funciona en iOS y Android, pero los UUIDs del servicio serie dependen del
 * adaptador concreto: valida contra tu modelo.
 *
 * Requiere un development build (no funciona en Expo Go).
 */
export class BleTransport implements OBDTransport {
  readonly name: string;

  private manager: BleManager;
  private device: Device | null = null;
  private subscription: Subscription | null = null;
  private readBuffer = new ReadBuffer();
  private connected = false;

  private serviceUuid: string | null;
  private notifyUuid: string | null;
  private writeUuid: string | null;
  private writeWithoutResponse: boolean;
  private readTimeoutMs: number;

  constructor(
    private deviceId: string,
    name: string,
    options: BleTransportOptions = {},
  ) {
    this.manager = new BleManager();
    this.name = name;
    this.serviceUuid = options.serviceUuid ?? null;
    this.notifyUuid = options.notifyUuid ?? null;
    this.writeUuid = options.writeUuid ?? null;
    this.writeWithoutResponse = true;
    this.readTimeoutMs = options.readTimeoutMs ?? 6000;
  }

  async connect(): Promise<void> {
    // Buffer nuevo en cada conexión: evita arrastrar restos de la anterior.
    this.readBuffer = new ReadBuffer();

    const device = await this.manager.connectToDevice(this.deviceId, {
      autoConnect: false,
      timeout: 15000,
    });
    this.device = device;

    await device.discoverAllServicesAndCharacteristics();
    await this.requestMtu(device);
    await this.resolveCharacteristics();
    await this.startNotifications();

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscription?.remove();
    this.subscription = null;
    this.readBuffer.rejectAll(new Error("connection closed"));

    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {
        // ignorar
      }
      this.device = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async write(data: string): Promise<void> {
    const device = this.device;
    if (!device || !this.serviceUuid || !this.writeUuid) {
      throw new Error("no conectado");
    }

    // El V011 usa write-without-response; si falla se reintenta con respuesta.
    const encoded = utf8ToBase64(data);
    const modes = this.writeWithoutResponse
      ? (["without", "with"] as const)
      : (["with", "without"] as const);

    let lastError: unknown = null;
    for (const mode of modes) {
      try {
        if (mode === "without") {
          await device.writeCharacteristicWithoutResponseForService(
            this.serviceUuid,
            this.writeUuid,
            encoded,
          );
          this.writeWithoutResponse = true;
        } else {
          await device.writeCharacteristicWithResponseForService(
            this.serviceUuid,
            this.writeUuid,
            encoded,
          );
          this.writeWithoutResponse = false;
        }
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("no se pudo escribir en el adaptador BLE");
  }

  async readUntil(
    char: string,
    timeoutMs = this.readTimeoutMs,
  ): Promise<string> {
    return this.readBuffer.readUntil(char, timeoutMs);
  }

  async clear(): Promise<void> {
    this.readBuffer.clear();
  }

  private async requestMtu(device: Device): Promise<void> {
    if (Platform.OS !== "android") return;
    try {
      await device.requestMTU(185);
    } catch {
      // Opcional: si el stack no lo permite se sigue con el MTU por defecto.
    }
  }

  private async resolveCharacteristics(): Promise<void> {
    const device = this.device;
    if (!device) throw new Error("dispositivo no conectado");

    // UUIDs forzados por el llamador: se usan tal cual.
    if (this.serviceUuid && this.notifyUuid && this.writeUuid) return;

    const services = await device.services();
    const inventory: ServiceInventory[] = [];
    for (const service of services) {
      inventory.push({
        uuid: service.uuid,
        characteristics: await service.characteristics(),
      });
    }

    // 1) Perfiles conocidos (el V011 usa FFE0/FFE1/FFE2).
    for (const profile of KNOWN_PROFILES) {
      const service = inventory.find(
        (item) => shortUuid(item.uuid) === profile.service,
      );
      if (!service) continue;

      const write = service.characteristics.find(
        (c) => shortUuid(c.uuid) === profile.write && isWritable(c),
      );
      const notify = service.characteristics.find(
        (c) => shortUuid(c.uuid) === profile.notify && isNotifiable(c),
      );

      if (write && notify) {
        this.assign(service.uuid, notify, write);
        return;
      }
    }

    // 2) Heurística: notificable + escribible dentro del mismo servicio.
    for (const service of inventory) {
      const notify = service.characteristics.find(isNotifiable);
      const write = service.characteristics.find(isWritable);
      if (notify && write) {
        this.assign(service.uuid, notify, write);
        return;
      }
    }

    const detail = inventory
      .map((item) => {
        const uuids = item.characteristics.map((c) => shortUuid(c.uuid));
        return `${shortUuid(item.uuid)}:[${uuids.join(",")}]`;
      })
      .join(" ");
    throw new Error(
      `no se encontraron las características de datos del adaptador BLE (${detail})`,
    );
  }

  private assign(
    serviceUuid: string,
    notify: Characteristic,
    write: Characteristic,
  ): void {
    this.serviceUuid = serviceUuid;
    this.notifyUuid = notify.uuid;
    this.writeUuid = write.uuid;
    this.writeWithoutResponse = write.isWritableWithoutResponse;
  }

  /**
   * Se suscribe a las respuestas. En Android la escritura del descriptor CCCD
   * es asíncrona: si se envía un comando justo después se pierde la respuesta,
   * así que se deja un margen antes del primer comando.
   */
  private async startNotifications(): Promise<void> {
    const device = this.device;
    if (!device || !this.serviceUuid || !this.notifyUuid) {
      throw new Error("características de notificación no resueltas");
    }

    try {
      this.subscription = device.monitorCharacteristicForService(
        this.serviceUuid,
        this.notifyUuid,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;
          this.readBuffer.append(base64ToUtf8(characteristic.value));
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `no se pudieron activar las notificaciones del adaptador BLE (${message})`,
      );
    }

    await delay(NOTIFY_SETTLE_MS);
  }
}
