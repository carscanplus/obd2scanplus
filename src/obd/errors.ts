export type OBDErrorCode =
  | "ConnectionFailed"
  | "NoConnection"
  | "InitFailed"
  | "InvalidResponse"
  | "NoData"
  | "DTCClearFailed"
  | "ECUUnavailable"
  | "ELM327WriteError"
  | "ELM327ReadError";

const MESSAGES: Record<OBDErrorCode, string> = {
  ConnectionFailed: "failed to establish connection with elm327.",
  NoConnection: "no serial connection active.",
  InitFailed: "failed to initialize obd with ecu.",
  InvalidResponse: "invalid response from ecu.",
  NoData: "'NO DATA' received from ECU.",
  DTCClearFailed: "failed to clear diagnostic trouble codes.",
  ECUUnavailable: "ecu not available.",
  ELM327WriteError: "error writing through serial connection.",
  ELM327ReadError: "error reading through serial connection.",
};

export class OBDError extends Error {
  constructor(public code: OBDErrorCode) {
    super(`obd error; ${MESSAGES[code]}`);
    this.name = "OBDError";
  }
}
