/** Invoice sequence per tenant and series, with no gaps or duplicates even when two closings run at once. */
export abstract class InvoiceNumbering {
  /**
   * Reserves the next number of a series inside the caller's transaction.
   * @param series Invoice series.
   * @returns The reserved number, without gaps.
   */
  abstract next(series: string): Promise<number>;
}
