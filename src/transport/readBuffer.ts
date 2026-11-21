interface PendingRead {
  delimiter: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Buffer de lectura compartido que acumula datos entrantes y resuelve las
 * promesas de `readUntil` cuando aparece el delimitador esperado.
 */
export class ReadBuffer {
  private buffer = "";
  private pending: PendingRead[] = [];

  append(data: string): void {
    this.buffer += data;
    this.flush();
  }

  readUntil(char: string, timeoutMs = 1500): Promise<string> {
    const index = this.buffer.indexOf(char);
    if (index >= 0) {
      const result = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + char.length);
      return Promise.resolve(result);
    }

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.remove(resolve);
        reject(new Error(`tiempo de espera agotado esperando '${char}'`));
      }, timeoutMs);

      this.pending.push({ delimiter: char, resolve, reject, timeout });
    });
  }

  clear(): void {
    this.buffer = "";
  }

  rejectAll(error: Error): void {
    for (const waiter of this.pending) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
    this.pending = [];
  }

  private flush(): void {
    for (let i = 0; i < this.pending.length; ) {
      const waiter = this.pending[i];
      const index = this.buffer.indexOf(waiter.delimiter);
      if (index < 0) {
        i += 1;
        continue;
      }

      clearTimeout(waiter.timeout);
      this.pending.splice(i, 1);
      waiter.resolve(this.buffer.slice(0, index));
      this.buffer = this.buffer.slice(index + waiter.delimiter.length);
    }
  }

  private remove(resolve: (value: string) => void): void {
    const index = this.pending.findIndex((w) => w.resolve === resolve);
    if (index >= 0) {
      clearTimeout(this.pending[index].timeout);
      this.pending.splice(index, 1);
    }
  }
}
