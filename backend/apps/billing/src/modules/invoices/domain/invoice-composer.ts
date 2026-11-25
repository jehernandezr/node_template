import {
  InvoiceLineKind,
  type Currency,
  type UsageMetric,
} from '@contracts/billing';
import type { InvoiceLineState } from './invoice.js';

/** What the invoice needs from the plan the period is charged with. */
export interface BilledPlan {
  readonly name: string;
  readonly priceMinor: number;
  readonly currency: Currency;
  readonly quotas: readonly {
    readonly metric: UsageMetric;
    readonly unitPriceMinor?: number;
  }[];
}

/** What is invoiced for a closed period. */
export interface BilledPeriod {
  readonly start: string;
  readonly end: string;
  readonly plan: BilledPlan;
  readonly prorationMinor: number;
  readonly usage: readonly {
    readonly metric: UsageMetric;
    readonly used: number;
  }[];
}

/**
 * The invoice lines of a period: the plan's fixed charge, the plan change adjustment if there was one,
 * and one line for each metric the plan charges per unit. Pure utility.
 */
export class InvoiceComposer {
  static lines(period: BilledPeriod): InvoiceLineState[] {
    const lines: InvoiceLineState[] = [
      {
        kind: InvoiceLineKind.FixedFee,
        description: `Plan ${period.plan.name}, ${period.start} a ${period.end}`,
        amountMinor: period.plan.priceMinor,
      },
    ];
    if (period.prorationMinor !== 0) {
      lines.push({
        kind: InvoiceLineKind.FixedFee,
        description: 'Ajuste por cambio de plan',
        amountMinor: period.prorationMinor,
      });
    }
    for (const quota of period.plan.quotas) {
      const used =
        period.usage.find((level) => level.metric === quota.metric)?.used ?? 0;
      if (quota.unitPriceMinor !== undefined && used > 0) {
        lines.push({
          kind: InvoiceLineKind.Usage,
          description: `Uso de ${quota.metric}: ${used} unidades`,
          amountMinor: used * quota.unitPriceMinor,
        });
      }
    }
    return lines;
  }
}
