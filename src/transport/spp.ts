import RNBluetoothClassic from "react-native-bluetooth-classic";

import { OBDTransport } from "../obd/transport";

interface PendingRead {
  delimiter: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Transporte Bluetooth Clásico (SPP) para Android usando
 * `react-native-bluetooth-classic`. Solo funciona en Android (en iOS el SPP
 * requiere hardware MFi y no está soportado aquí).
 *
 * Requiere validación con un dispositivo real.
 */
export class SppTransport implements OBDTransport {
  readonly name: string;

  private address: string;
  private connected = false;
  private buffer = "";
  private subscription: { remove(): void } | null = null;
  private pending: PendingRead[] = [];

  constructor(address: string, name: string) {
    this.address = address;
    this.name = name;
  }

  async connect(): Promise<void> {
    // Los ELM327 responden cuando tienen datos disponibles y terminan cada
    // respuesta con `>`, no con el delimitador `\n` que usa la librería por
    // defecto. Un delimitador vacío entrega cada bloque recibido para que
    // readUntil(">") pueda ensamblarlo correctamente.
    //
    // Muchos adaptadores ELM327 económicos también exponen RFCOMM sin el
    // requisito de un socket seguro.
    await RNBluetoothClassic.connectToDevice(this.address, {
      delimiter: "",
      charset: "ascii",
      secureSocket: false,
    });
    this.connected = true;
    this.buffer = "";

    this.subscription = RNBluetoothClassic.onDeviceRead(
      this.address,
      (event) => {
        this.buffer += event.data;
        this.flushPending();
      },
    );
  }

  async disconnect(): Promise<void> {
    this.subscription?.remove();
    this.subscription = null;
    this.rejectAll(new Error("connection closed"));
    try {
      await RNBluetoothClassic.disconnectFromDevice(this.address);
    } catch {
      // ignorar errores al desconectar
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async write(data: string): Promise<void> {
    await RNBluetoothClassic.writeToDevice(this.address, data, "utf-8");
  }

  async readUntil(char: string, timeoutMs = 1500): Promise<string> {
    const index = this.buffer.indexOf(char);
    if (index >= 0) {
      const result = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + char.length);
      return result;
    }

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removePending(resolve);
        reject(new Error(`tiempo de espera agotado esperando '${char}'`));
      }, timeoutMs);

      this.pending.push({ delimiter: char, resolve, reject, timeout });
    });
  }

  async clear(): Promise<void> {
    this.buffer = "";
    try {
      await RNBluetoothClassic.clearFromDevice(this.address);
    } catch {
      // ignorar
    }
  }

  private flushPending(): void {
    for (let i = this.pending.length - 1; i >= 0; i -= 1) {
      const waiter = this.pending[i];
      const index = this.buffer.indexOf(waiter.delimiter);
      if (index < 0) continue;

      clearTimeout(waiter.timeout);
      this.pending.splice(i, 1);
      waiter.resolve(this.buffer.slice(0, index));
      this.buffer = this.buffer.slice(index + waiter.delimiter.length);
    }
  }

  private removePending(resolve: (value: string) => void): void {
    const index = this.pending.findIndex((w) => w.resolve === resolve);
    if (index >= 0) {
      clearTimeout(this.pending[index].timeout);
      this.pending.splice(index, 1);
    }
  }

  private rejectAll(error: Error): void {
    for (const waiter of this.pending) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
    this.pending = [];
  }
}
