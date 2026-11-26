import type {
  Invoice as InvoiceView,
  InvoiceChange,
  InvoiceSummary,
} from '@contracts/billing';
import type { InvoiceState } from '../domain/invoice.js';

/** The invoice as the contract publishes it. Pure utility. */
export class InvoiceViews {
  /**
   * Builds the list row of an invoice.
   * @param state Stored invoice.
   * @returns The summary shown in the invoice list.
   */
  static summary(state: InvoiceState): InvoiceSummary {
    return {
      id: state.id,
      number: state.number,
      period: { start: state.periodStart, end: state.periodEnd },
      status: state.status,
      currency: state.currency,
      total: { amountMinor: state.totalMinor, currency: state.currency },
    };
  }

  /**
   * Builds the change record of an invoice for the reports projection.
   * @param state Stored invoice.
   * @returns The change with its status and totals.
   */
  static change(state: InvoiceState): InvoiceChange {
    return {
      ...InvoiceViews.summary(state),
      issuedAt: state.issuedAt.toISOString(),
      paidAt: state.paidAt?.toISOString() ?? null,
    };
  }

  /**
   * Builds the full view of an invoice with its lines.
   * @param state Stored invoice.
   * @returns The invoice as the API returns it.
   */
  static detail(state: InvoiceState): InvoiceView {
    return {
      ...InvoiceViews.summary(state),
      lines: state.lines.map((line) => ({
        kind: line.kind,
        description: line.description,
        amount: { amountMinor: line.amountMinor, currency: state.currency },
      })),
    };
  }
}
