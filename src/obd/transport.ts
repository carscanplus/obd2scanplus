/**
 * Abstracción de transporte para hablar con un adaptador ELM327.
 * Las implementaciones reales (SPP Bluetooth y BLE) vivirán en `src/transport/`.
 */
export interface OBDTransport {
  /** Nombre legible del dispositivo/puerto (p. ej. "OBDII" o "COM4"). */
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  /** Escribe datos crudos al adaptador (sin incluir el `\r` final). */
  write(data: string): Promise<void>;

  /**
   * Lee bytes hasta encontrar el carácter indicado (por defecto `>`).
   * Devuelve todo lo leído sin incluir el carácter finalizador.
   */
  readUntil(char: string, timeoutMs?: number): Promise<string>;

  /** Limpia los buffers de entrada/salida. */
  clear(): Promise<void>;
}
