import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

// Línea base de violaciones tolerables: cuenta por archivo y regla.
// Formato del JSON: { "version": 1, "violations": { "<archivo>": { "<ruleId>": <cuenta> } } }
// con archivos y reglas en orden alfabético, sangría de 2 espacios y salto de línea final.
export class Baseline {
  static VERSION = 1;

  // counts: Map<archivo, Map<ruleId, número>>
  constructor(counts = new Map()) {
    this.counts = counts;
  }

  static empty() {
    return new Baseline();
  }

  // Lee el JSON de path; si el archivo no existe devuelve una línea base vacía.
  static load(path) {
    if (!existsSync(path)) return Baseline.empty();
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (data.version !== Baseline.VERSION) {
      throw new Error('línea base con versión no soportada');
    }
    const counts = new Map();
    for (const [file, rules] of Object.entries(data.violations ?? {})) {
      counts.set(file, new Map(Object.entries(rules)));
    }
    return new Baseline(counts);
  }

  // Agrupa Violation[] por archivo y regla.
  static fromViolations(violations) {
    const counts = new Map();
    for (const violation of violations) {
      if (!counts.has(violation.file)) counts.set(violation.file, new Map());
      const rules = counts.get(violation.file);
      rules.set(violation.ruleId, (rules.get(violation.ruleId) ?? 0) + 1);
    }
    return new Baseline(counts);
  }

  count(file, ruleId) {
    return this.counts.get(file)?.get(ruleId) ?? 0;
  }

  // Escribe el JSON en path con el formato descrito arriba.
  save(path) {
    mkdirSync(dirname(path), { recursive: true });
    const violations = {};
    for (const file of [...this.counts.keys()].sort()) {
      const rules = this.counts.get(file);
      violations[file] = {};
      for (const ruleId of [...rules.keys()].sort()) {
        violations[file][ruleId] = rules.get(ruleId);
      }
    }
    writeFileSync(
      path,
      JSON.stringify({ version: Baseline.VERSION, violations }, null, 2) + '\n',
    );
  }

  // Devuelve { fresh: Violation[], stale: string[] }.
  // fresh: todas las violaciones de cada par (archivo, regla) cuya cuenta real supera la de la
  //   línea base (un par que no está en la línea base tiene cuenta 0).
  // stale: un texto "<archivo>: <ruleId> (línea base N, real M)" por cada par con M < N.
  filterNew(violations) {
    const actual = Baseline.fromViolations(violations);
    const fresh = violations.filter(
      (v) => actual.count(v.file, v.ruleId) > this.count(v.file, v.ruleId),
    );
    const stale = [];
    for (const [file, rules] of this.counts) {
      for (const [ruleId, expected] of rules) {
        const real = actual.count(file, ruleId);
        if (real < expected) {
          stale.push(
            `${file}: ${ruleId} (línea base ${expected}, real ${real})`,
          );
        }
      }
    }
    return { fresh, stale: stale.sort() };
  }
}
