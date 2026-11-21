/**
 * Evaluador de fórmulas de PIDs con soporte para multiplicación implícita
 * (ej. `256A`, `2/65536(256A+B)`, `10(256A+B)`).
 *
 * Reemplaza el uso de la crate `evalexpr` en OBDium para ecuaciones dinámicas.
 */

export interface FormulaVariables {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
}

type Token =
  | { kind: "num"; value: number }
  | { kind: "id"; name: string }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      const value = parseFloat(src.slice(i, j));
      if (Number.isNaN(value))
        throw new Error(`Número inválido en la posición ${i}`);
      tokens.push({ kind: "num", value });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      tokens.push({ kind: "id", name: ch });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i += 1;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ kind: "op", value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Carácter inesperado '${ch}'`);
  }
  return tokens;
}

class Parser {
  private pos = 0;

  constructor(
    private tokens: Token[],
    private vars: FormulaVariables,
  ) {}

  parse(): number {
    const value = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error(`Token inesperado en la posición ${this.pos}`);
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private startsFactor(t: Token | undefined): boolean {
    if (!t) return false;
    return t.kind === "num" || t.kind === "id" || t.kind === "lparen";
  }

  private parseExpression(): number {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t?.kind === "op" && (t.value === "+" || t.value === "-")) {
        this.pos += 1;
        const right = this.parseTerm();
        left = t.value === "+" ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseTerm(): number {
    let left = this.parseFactor();
    for (;;) {
      const t = this.peek();
      if (t?.kind === "op" && (t.value === "*" || t.value === "/")) {
        this.pos += 1;
        const right = this.parseFactor();
        if (t.value === "*") {
          left *= right;
        } else {
          if (right === 0) throw new Error("División por cero");
          left /= right;
        }
      } else if (this.startsFactor(t)) {
        // Multiplicación implícita: `256A`, `65536(256A+B)`
        const right = this.parseFactor();
        left *= right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseFactor(): number {
    const t = this.peek();
    if (t?.kind === "op" && t.value === "-") {
      this.pos += 1;
      return -this.parseFactor();
    }
    if (t?.kind === "op" && t.value === "+") {
      this.pos += 1;
      return this.parseFactor();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new Error("Fin inesperado de la expresión");
    if (t.kind === "num") {
      this.pos += 1;
      return t.value;
    }
    if (t.kind === "id") {
      this.pos += 1;
      const value = this.vars[t.name as keyof FormulaVariables];
      if (value === undefined)
        throw new Error(`Variable desconocida '${t.name}'`);
      return value;
    }
    if (t.kind === "lparen") {
      this.pos += 1;
      const value = this.parseExpression();
      const next = this.peek();
      if (next?.kind !== "rparen") throw new Error("Se esperaba ')'");
      this.pos += 1;
      return value;
    }
    throw new Error(`Token inesperado '${t.kind}'`);
  }
}

export function evaluateFormula(
  formula: string,
  vars: FormulaVariables,
): number {
  const tokens = tokenize(formula.toUpperCase());
  return new Parser(tokens, vars).parse();
}
