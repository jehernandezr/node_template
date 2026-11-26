import type { ForwardEntry } from '../definition/forward-entry.js';
import type { StepDirection } from './step-direction.enum.js';
import type { StepLogEntry } from './step-log-entry.js';

/** Read-only step journal of a saga. */
export class StepLog {
  private constructor(private readonly items: readonly StepLogEntry[]) {}

  /**
   * Builds a step log from stored entries.
   * @param entries Entries.
   * @returns The log.
   */
  static of(entries: readonly StepLogEntry[]): StepLog {
    return new StepLog(entries);
  }

  /**
   * Entries in the order the store returned them.
   * @returns The entries.
   */
  entries(): readonly StepLogEntry[] {
    return this.items;
  }

  /**
   * The entry of a step in one direction, if it exists.
   * @param stepIndex Step index.
   * @param direction Direction.
   * @returns The entry, or `undefined`.
   */
  find(stepIndex: number, direction: StepDirection): StepLogEntry | undefined {
    return this.items.find(
      (entry) => entry.stepIndex === stepIndex && entry.direction === direction,
    );
  }

  /**
   * Journal with `entry` in place of its predecessor, or appended if it is new.
   * @param entry Entry to add.
   * @returns The new log.
   */
  with(entry: StepLogEntry): StepLog {
    const matches = (item: StepLogEntry): boolean =>
      item.stepIndex === entry.stepIndex && item.direction === entry.direction;
    return new StepLog(
      this.items.some(matches)
        ? this.items.map((item) => (matches(item) ? entry : item))
        : [...this.items, entry],
    );
  }

  /**
   * The view of a forward entry that the compensation input builders receive.
   * @param entry Forward entry.
   * @returns The view.
   */
  static forwardEntryOf(entry: StepLogEntry): ForwardEntry {
    return {
      input: entry.input,
      output: entry.output,
      idempotencyKey: entry.idempotencyKey,
      status: entry.status,
    };
  }
}
