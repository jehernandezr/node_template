import {
  InvoiceLineKind,
  type Currency,
  type UsageMetric,
} from '@contracts/billing';
import type { InvoiceLineState } from './invoice.js';

/** Lo que la factura necesita del plan con que se cobra el periodo. */
export interface BilledPlan {
  readonly name: string;
  readonly priceMinor: number;
  readonly currency: Currency;
  readonly quotas: readonly {
    readonly metric: UsageMetric;
    readonly unitPriceMinor?: number;
  }[];
}

/** Lo que se factura de un periodo cerrado. */
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
 * Las líneas de la factura de un periodo: el cargo fijo del plan, el ajuste de los cambios de plan si lo hubo
 * y una línea por cada métrica que el plan cobra por unidad. Utilidad pura.
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
