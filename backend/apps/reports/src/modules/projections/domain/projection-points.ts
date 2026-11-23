import type { Currency } from '@contracts/billing';
import type { NotificationType } from '@contracts/notifications';
import type { TaskStatus } from '@contracts/tasks';

/** Tareas vigentes por estado. */
export interface StatusCount {
  readonly status: TaskStatus;
  readonly count: number;
}

/** Tareas creadas y terminadas en un periodo. */
export interface ActivityPoint {
  readonly period: string;
  readonly created: number;
  readonly completed: number;
}

/** Facturas de un periodo y una moneda: cuántas se emitieron, pagaron y fallaron, y cuánto se emitió. */
export interface InvoicePoint {
  readonly period: string;
  readonly currency: Currency;
  readonly issued: number;
  readonly paid: number;
  readonly failed: number;
  readonly issuedMinor: number;
}

/** Notificaciones de un periodo y un tipo, por canal por el que salieron. */
export interface DeliveryPoint {
  readonly period: string;
  readonly type: NotificationType;
  readonly inApp: number;
  readonly push: number;
  readonly email: number;
}
