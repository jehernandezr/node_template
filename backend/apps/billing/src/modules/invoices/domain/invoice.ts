import {
  BillingErrorCode,
  InvoiceStatus,
  type Currency,
  type InvoiceLineKind,
} from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';

/** Una línea de factura en unidades menores de la moneda de la factura. */
export interface InvoiceLineState {
  readonly kind: InvoiceLineKind;
  readonly description: string;
  readonly amountMinor: number;
}

/** Estado completo de una factura, tal como se guarda. */
export interface InvoiceState {
  readonly id: string;
  readonly number: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly status: InvoiceStatus;
  readonly currency: Currency;
  readonly lines: readonly InvoiceLineState[];
  readonly totalMinor: number;
  readonly issuedAt: Date;
  /** Cobros fallidos de la factura. */
  readonly failedAttempts: number;
  readonly paidAt?: Date;
  readonly version?: number;
}

/** Una factura emitida y su cobro: se paga o falla, y un pago tardío la salda aunque haya fallado antes. */
export class Invoice {
  private constructor(private state: InvoiceState) {}

  static issue(input: {
    readonly id: string;
    readonly number: string;
    readonly periodStart: string;
    readonly periodEnd: string;
    readonly currency: Currency;
    readonly lines: readonly InvoiceLineState[];
    readonly now: Date;
  }): Invoice {
    return new Invoice({
      id: input.id,
      number: input.number,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: InvoiceStatus.Issued,
      currency: input.currency,
      lines: input.lines,
      totalMinor: input.lines.reduce((sum, line) => sum + line.amountMinor, 0),
      issuedAt: input.now,
      failedAttempts: 0,
    });
  }

  static rehydrate(state: InvoiceState): Invoice {
    return new Invoice(state);
  }

  snapshot(): InvoiceState {
    return this.state;
  }

  /**
   * Devuelve `false` si ya estaba pagada.
   * @throws BillingError `BILLING.INVOICE.INVALID_STATE` si está anulada o en borrador.
   */
  pay(at: Date): boolean {
    if (this.state.status === InvoiceStatus.Paid) {
      return false;
    }
    this.assertCollectable();
    this.state = { ...this.state, status: InvoiceStatus.Paid, paidAt: at };
    return true;
  }

  /**
   * Cuenta un cobro fallido. Devuelve `false` si ya figuraba como fallida.
   * @throws BillingError `BILLING.INVOICE.INVALID_STATE` si está pagada, anulada o en borrador.
   */
  fail(): boolean {
    if (this.state.status === InvoiceStatus.Failed) {
      return false;
    }
    this.assertCollectable();
    this.state = {
      ...this.state,
      status: InvoiceStatus.Failed,
      failedAttempts: this.state.failedAttempts + 1,
    };
    return true;
  }

  private assertCollectable(): void {
    if (
      this.state.status !== InvoiceStatus.Issued &&
      this.state.status !== InvoiceStatus.Failed
    ) {
      throw new BillingError(BillingErrorCode.InvoiceInvalidState, {
        status: this.state.status,
      });
    }
  }
}
