import type { ForwardEntry } from '../definition/forward-entry.js';
import type { StepDirection } from './step-direction.enum.js';
import type { StepLogEntry } from './step-log-entry.js';

/** Bitácora de pasos de una saga, de solo lectura. */
export class StepLog {
  private constructor(private readonly items: readonly StepLogEntry[]) {}

  static of(entries: readonly StepLogEntry[]): StepLog {
    return new StepLog(entries);
  }

  /** Entradas en el orden en que las devolvió el almacén. */
  entries(): readonly StepLogEntry[] {
    return this.items;
  }

  /** La entrada de un paso en una dirección, si existe. */
  find(stepIndex: number, direction: StepDirection): StepLogEntry | undefined {
    return this.items.find(
      (entry) => entry.stepIndex === stepIndex && entry.direction === direction,
    );
  }

  /** Bitácora con `entry` en lugar de su antecesora, o agregada si es nueva. */
  with(entry: StepLogEntry): StepLog {
    const matches = (item: StepLogEntry): boolean =>
      item.stepIndex === entry.stepIndex && item.direction === entry.direction;
    return new StepLog(
      this.items.some(matches)
        ? this.items.map((item) => (matches(item) ? entry : item))
        : [...this.items, entry],
    );
  }

  /** La vista de una entrada hacia delante que reciben los constructores de entrada de compensación. */
  static forwardEntryOf(entry: StepLogEntry): ForwardEntry {
    return {
      input: entry.input,
      output: entry.output,
      idempotencyKey: entry.idempotencyKey,
      status: entry.status,
    };
  }
}
