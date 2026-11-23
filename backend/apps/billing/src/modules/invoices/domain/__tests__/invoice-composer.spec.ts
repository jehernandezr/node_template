import { Currency, InvoiceLineKind, UsageMetric } from '@contracts/billing';
import { InvoiceComposer, type BilledPeriod } from '../invoice-composer.js';

const period = (overrides: Partial<BilledPeriod> = {}): BilledPeriod => ({
  start: '2026-11-01',
  end: '2026-11-30',
  plan: {
    name: 'Pro',
    priceMinor: 189_000,
    currency: Currency.Cop,
    quotas: [
      { metric: UsageMetric.Users },
      { metric: UsageMetric.ApiCalls, unitPriceMinor: 2 },
    ],
  },
  prorationMinor: 0,
  usage: [
    { metric: UsageMetric.Users, used: 7 },
    { metric: UsageMetric.ApiCalls, used: 1_500 },
  ],
  ...overrides,
});

describe('InvoiceComposer', () => {
  it('charges the fixed fee of the plan and only the usage of metrics with a unit price', () => {
    expect(InvoiceComposer.lines(period())).toEqual([
      {
        kind: InvoiceLineKind.FixedFee,
        description: 'Plan Pro, 2026-11-01 a 2026-11-30',
        amountMinor: 189_000,
      },
      {
        kind: InvoiceLineKind.Usage,
        description: 'Uso de api_calls: 1500 unidades',
        amountMinor: 3_000,
      },
    ]);
  });

  it('adds the adjustment of the plan changes of the period', () => {
    const lines = InvoiceComposer.lines(
      period({ prorationMinor: 46_367, usage: [] }),
    );

    expect(lines).toEqual([
      expect.objectContaining({ amountMinor: 189_000 }),
      {
        kind: InvoiceLineKind.FixedFee,
        description: 'Ajuste por cambio de plan',
        amountMinor: 46_367,
      },
    ]);
  });
});
