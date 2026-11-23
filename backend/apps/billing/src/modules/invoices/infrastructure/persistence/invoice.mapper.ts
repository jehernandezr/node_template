import type {
  Currency,
  InvoiceLineKind,
  InvoiceStatus,
} from '@contracts/billing';
import { Invoice } from '../../domain/invoice.js';
import { InvoiceLineEntity } from './entities/invoice-line.entity.js';
import { InvoiceEntity } from './entities/invoice.entity.js';

/** Filas de `invoices` e `invoice_lines` y agregado `Invoice`, en los dos sentidos. Utilidad pura. */
export class InvoiceMapper {
  static toDomain(
    row: InvoiceEntity,
    lines: readonly InvoiceLineEntity[],
  ): Invoice {
    return Invoice.rehydrate({
      id: row.id,
      number: row.number,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      status: row.status as InvoiceStatus,
      currency: row.currency as Currency,
      totalMinor: Number(row.totalMinor),
      issuedAt: row.issuedAt,
      failedAttempts: row.failedAttempts,
      lines: [...lines]
        .sort((a, b) => a.position - b.position)
        .map((line) => ({
          kind: line.kind as InvoiceLineKind,
          description: line.description,
          amountMinor: Number(line.amountMinor),
        })),
      ...(row.paidAt === null ? {} : { paidAt: row.paidAt }),
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  static toRow(invoice: Invoice): InvoiceEntity {
    const state = invoice.snapshot();
    return Object.assign(new InvoiceEntity(), {
      id: state.id,
      number: state.number,
      periodStart: state.periodStart,
      periodEnd: state.periodEnd,
      status: state.status,
      currency: state.currency,
      totalMinor: String(state.totalMinor),
      issuedAt: state.issuedAt,
      paidAt: state.paidAt ?? null,
      failedAttempts: state.failedAttempts,
      ...(state.version === undefined ? {} : { version: state.version }),
    });
  }
}
