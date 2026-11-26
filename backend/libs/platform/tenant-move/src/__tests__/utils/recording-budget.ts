import { SystemClock } from '@platform/kernel';
import { TransferBudget } from '../../transfer/transfer-budget.js';

/** A generous call budget that records the table of each batch it is asked about, to count the batches per table. */
export class RecordingBudget extends TransferBudget {
  private readonly checked: string[] = [];

  constructor() {
    super(new SystemClock(), 60_000);
  }

  /**
   * Records the table and checks the time left.
   * @param table Table of the next batch.
   */
  override check(table: string): void {
    this.checked.push(table);
    super.check(table);
  }

  /**
   * Counts the batches asked about for a table.
   * @param table Table to count.
   * @returns How many batches of that table checked the budget.
   */
  batchesOf(table: string): number {
    return this.checked.filter((entry) => entry === table).length;
  }
}
