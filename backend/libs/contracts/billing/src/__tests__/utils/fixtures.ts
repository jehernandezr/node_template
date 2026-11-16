import { PlanFeature } from '@contracts/identity';
import {
  Currency,
  InvoiceLineKind,
  InvoiceStatus,
  PlanPeriodicity,
  SubscriptionStatus,
  UsageMetric,
} from '../../enums/billing.enum.js';

/** Identificadores UUIDv7 fijos para que las pruebas sean reproducibles. */
export const Ids = {
  user: '0190f2a4-7b3c-7d4e-8f00-000000000001',
  tenant: '0190f2a4-7b3c-7d4e-8f00-000000000002',
  item: '0190f2a4-7b3c-7d4e-8f00-000000000003',
  other: '0190f2a4-7b3c-7d4e-8f00-000000000004',
} as const;

/** Instante ISO 8601 fijo. */
export const Now = '2026-11-13T12:00:00.000Z';

/** UUID v4: no cumple el contrato, que exige v7. */
export const UuidV4 = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/** Periodo de facturación de noviembre. */
export const Period = { start: '2026-11-01', end: '2026-11-30' } as const;

/** Monto de un plan mensual en dólares. */
export const Price = { amountMinor: 4900, currency: Currency.Usd } as const;

/** Plan de ejemplo con una cuota y una funcionalidad. */
export const Plan = {
  id: Ids.item,
  name: 'Equipo',
  price: Price,
  periodicity: PlanPeriodicity.Monthly,
  quotas: [{ metric: UsageMetric.Users, limit: 10 }],
  features: [PlanFeature.Billing],
} as const;

/** Suscripción de ejemplo sobre el plan de arriba. */
export const Subscription = {
  id: Ids.other,
  plan: Plan,
  status: SubscriptionStatus.Active,
  period: Period,
} as const;

/** Factura de ejemplo con una línea de cargo fijo. */
export const Invoice = {
  id: Ids.item,
  number: 'FAC-0001',
  period: Period,
  status: InvoiceStatus.Issued,
  currency: Currency.Usd,
  lines: [
    {
      kind: InvoiceLineKind.FixedFee,
      description: 'Plan Equipo de noviembre',
      amount: Price,
    },
  ],
  total: Price,
} as const;

/** Registro de uso válido con su llave de idempotencia. */
export const UsageRecord = {
  metric: UsageMetric.ApiCalls,
  quantity: 5,
  windowStart: Now,
  key: 'tasks:tenant:api_calls:2026-11-13T12:00',
} as const;
