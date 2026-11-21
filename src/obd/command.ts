/**
 * Abstracción de comandos OBD, portada de `backend/src/cmd.rs`.
 */
export type CommandType =
  | "PIDCommand"
  | "ATCommand"
  | "ServiceQuery"
  | "Arbitrary"
  | "Default";

export class Command {
  private type: CommandType = "Default";
  private pidCommand = "";
  private atCommand = "";
  private svcCommand = "";
  private arbitraryMessage = "";

  static newPid(pid: string): Command {
    const c = new Command();
    c.type = "PIDCommand";
    c.pidCommand = pid;
    return c;
  }

  static newAt(at: string): Command {
    const c = new Command();
    c.type = "ATCommand";
    c.atCommand = at;
    return c;
  }

  static newSvc(svc: string): Command {
    const c = new Command();
    c.type = "ServiceQuery";
    c.svcCommand = svc;
    return c;
  }

  static newArb(message: string): Command {
    const c = new Command();
    c.type = "Arbitrary";
    c.arbitraryMessage = message;
    return c;
  }

  get commandType(): CommandType {
    return this.type;
  }

  getPid(): string {
    return this.pidCommand;
  }

  getAt(): string {
    return this.atCommand;
  }

  getSvc(): string {
    return this.svcCommand;
  }

  getMsg(): string {
    return this.arbitraryMessage;
  }

  asString(): string {
    switch (this.type) {
      case "PIDCommand":
        return this.pidCommand;
      case "ATCommand":
        return this.atCommand;
      case "ServiceQuery":
        return this.svcCommand;
      case "Arbitrary":
        return this.arbitraryMessage;
      default:
        return "";
    }
  }
}
