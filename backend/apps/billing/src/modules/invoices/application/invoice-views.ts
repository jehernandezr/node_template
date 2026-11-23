import type {
  Invoice as InvoiceView,
  InvoiceChange,
  InvoiceSummary,
} from '@contracts/billing';
import type { InvoiceState } from '../domain/invoice.js';

/** La factura como la publica el contrato. Utilidad pura. */
export class InvoiceViews {
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

  static change(state: InvoiceState): InvoiceChange {
    return {
      ...InvoiceViews.summary(state),
      issuedAt: state.issuedAt.toISOString(),
      paidAt: state.paidAt?.toISOString() ?? null,
    };
  }

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
