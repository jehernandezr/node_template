/** Invoice sequence per tenant and series, with no gaps or duplicates even when two closings run at once. */
export abstract class InvoiceNumbering {
  abstract next(series: string): Promise<number>;
}
