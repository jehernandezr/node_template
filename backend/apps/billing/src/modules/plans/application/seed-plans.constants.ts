import { Currency, PlanPeriodicity, UsageMetric } from '@contracts/billing';
import { PlanFeature } from '@contracts/identity';
import type { PlanState } from '../domain/plan.js';

/**
 * Planes de demostración de la plantilla, los mismos del microfrontend de billing. Los precios son una
 * decisión comercial: se editan en el catálogo y la semilla solo los repone por `code`. Ningún plan cobra por
 * unidad, así que las facturas no llevan líneas de uso hasta que un plan defina `unitPriceMinor`.
 */
export const SEED_PLANS: readonly Omit<PlanState, 'id'>[] = [
  {
    code: 'inicio',
    name: 'Inicio',
    priceMinor: 49_900,
    currency: Currency.Cop,
    periodicity: PlanPeriodicity.Monthly,
    quotas: [
      { metric: UsageMetric.Users, limit: 5 },
      { metric: UsageMetric.ApiCalls, limit: 10_000 },
    ],
    features: [PlanFeature.Billing],
  },
  {
    code: 'pro',
    name: 'Pro',
    priceMinor: 189_000,
    currency: Currency.Cop,
    periodicity: PlanPeriodicity.Monthly,
    quotas: [
      { metric: UsageMetric.Users, limit: 25 },
      { metric: UsageMetric.ApiCalls, limit: 100_000 },
      { metric: UsageMetric.StorageGb, limit: 50 },
    ],
    features: [
      PlanFeature.Billing,
      PlanFeature.Webhooks,
      PlanFeature.AdvancedReports,
    ],
  },
  {
    code: 'empresa',
    name: 'Empresa',
    priceMinor: 110_000,
    currency: Currency.Usd,
    periodicity: PlanPeriodicity.Annual,
    quotas: [
      { metric: UsageMetric.Users, limit: 200 },
      { metric: UsageMetric.ApiCalls, limit: 1_000_000 },
      { metric: UsageMetric.StorageGb, limit: 500 },
    ],
    features: Object.values(PlanFeature),
  },
];
