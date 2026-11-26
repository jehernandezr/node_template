import { InvoiceNumbering } from '../../domain/invoice-numbering.js';

/** `InvoiceNumbering` that hands out each series' numbers in order, without gaps. */
export class SequentialInvoiceNumbering extends InvoiceNumbering {
  private readonly last = new Map<string, number>();

  override async next(series: string): Promise<number> {
    const next = (this.last.get(series) ?? 0) + 1;
    this.last.set(series, next);
    return next;
  }
}
