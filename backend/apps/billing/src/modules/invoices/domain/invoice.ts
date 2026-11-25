import {
  BillingErrorCode,
  InvoiceStatus,
  type Currency,
  type InvoiceLineKind,
} from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import type { CollectionRetrySchedule } from './collection-retry-schedule.js';

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
  /** Cobros rechazados de la factura; el próximo intento de cobro es el `failedAttempts + 1`. */
  readonly failedAttempts: number;
  /** Cuándo toca cobrarla: al emitirla y después de cada rechazo según el calendario. Sin valor, no se cobra sola. */
  readonly nextCollectionAt?: Date;
  readonly paidAt?: Date;
  readonly version?: number;
}

/**
 * Una factura emitida y su cobro: se paga o se rechaza, se reintenta según un calendario y un pago tardío la salda
 * aunque haya fallado antes.
 */
export class Invoice {
  private constructor(private state: InvoiceState) {}

  /**
   * Emite una factura con el total de sus líneas, lista para cobrarse en el acto.
   * @param input Id, número, periodo, moneda, líneas y momento de emisión.
   * @returns La factura emitida, sin rechazos.
   */
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
      nextCollectionAt: input.now,
    });
  }

  /**
   * Reconstruye una factura guardada sin validar de nuevo.
   * @param state Estado leído de la persistencia.
   * @returns La factura.
   */
  static rehydrate(state: InvoiceState): Invoice {
    return new Invoice(state);
  }

  /**
   * Estado actual, para guardarlo o mostrarlo.
   * @returns El estado, de solo lectura.
   */
  snapshot(): InvoiceState {
    return this.state;
  }

  /**
   * Número del intento de cobro que toca: cada rechazo abre el siguiente.
   * @returns `failedAttempts + 1`.
   */
  collectionAttempt(): number {
    return this.state.failedAttempts + 1;
  }

  /**
   * Indica si toca cobrarla: sin pagar y con su próximo cobro vencido.
   * @param now Momento de referencia.
   * @returns `true` si está emitida o fallida y `nextCollectionAt` ya pasó.
   */
  isDueForCollection(now: Date): boolean {
    const next = this.state.nextCollectionAt;
    return (
      (this.state.status === InvoiceStatus.Issued ||
        this.state.status === InvoiceStatus.Failed) &&
      next !== undefined &&
      next.getTime() <= now.getTime()
    );
  }

  /**
   * Comprueba que lo pagado sea el total de la factura en su moneda.
   * @param amount Monto que informa el proveedor.
   * @throws BillingError `BILLING.INVOICE.AMOUNT_MISMATCH` si no coincide.
   */
  assertTotal(amount: { amountMinor: number; currency: string }): void {
    if (
      amount.amountMinor !== this.state.totalMinor ||
      amount.currency !== this.state.currency
    ) {
      throw new BillingError(BillingErrorCode.InvoiceAmountMismatch, {
        expected: {
          amountMinor: this.state.totalMinor,
          currency: this.state.currency,
        },
        received: amount,
      });
    }
  }

  /**
   * Salda la factura, aunque un cobro anterior se haya rechazado.
   * @param at Momento del pago.
   * @returns `false` si ya estaba pagada.
   * @throws BillingError `BILLING.INVOICE.INVALID_STATE` si está anulada o en borrador.
   */
  pay(at: Date): boolean {
    if (this.state.status === InvoiceStatus.Paid) {
      return false;
    }
    this.assertCollectable();
    this.state = {
      ...this.state,
      status: InvoiceStatus.Paid,
      paidAt: at,
      nextCollectionAt: undefined,
    };
    return true;
  }

  /**
   * Anota el rechazo del intento `attempt` y programa el siguiente según `retries`.
   * @param at Momento del rechazo.
   * @param attempt Número del intento rechazado.
   * @param retries Calendario de reintentos.
   * @returns `false` si ese rechazo ya estaba anotado: el job y el webhook pueden informar el mismo.
   * @throws BillingError `BILLING.INVOICE.INVALID_STATE` si está pagada, anulada o en borrador.
   */
  fail(at: Date, attempt: number, retries: CollectionRetrySchedule): boolean {
    this.assertCollectable();
    if (attempt <= this.state.failedAttempts) {
      return false;
    }
    this.state = {
      ...this.state,
      status: InvoiceStatus.Failed,
      failedAttempts: attempt,
      nextCollectionAt: retries.nextAfter(attempt, at),
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
