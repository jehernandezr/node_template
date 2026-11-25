import type { Currency } from '@contracts/billing';
import type { NotificationType } from '@contracts/notifications';
import type { TaskStatus } from '@contracts/tasks';

/** Current tasks by status. */
export interface StatusCount {
  readonly status: TaskStatus;
  readonly count: number;
}

/** Tasks created and completed in a period. */
export interface ActivityPoint {
  readonly period: string;
  readonly created: number;
  readonly completed: number;
}

/** Invoices of a period and a currency: how many were issued, paid and failed, and how much was issued. */
export interface InvoicePoint {
  readonly period: string;
  readonly currency: Currency;
  readonly issued: number;
  readonly paid: number;
  readonly failed: number;
  readonly issuedMinor: number;
}

/** Notifications of a period and a type, by channel they went out through. */
export interface DeliveryPoint {
  readonly period: string;
  readonly type: NotificationType;
  readonly inApp: number;
  readonly push: number;
  readonly email: number;
}
