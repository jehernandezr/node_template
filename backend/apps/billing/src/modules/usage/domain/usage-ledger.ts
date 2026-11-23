import type { UsageMetric } from '@contracts/billing';

/** Un registro de uso que llegó de un servicio que mide, con su llave de idempotencia. */
export interface MeteredUsage {
  readonly id: string;
  readonly key: string;
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly windowStart: Date;
}

/** Lo usado de una métrica en un rango de días. */
export interface UsageLevel {
  readonly metric: UsageMetric;
  readonly used: number;
}

/** Uso del tenant del `ShardScope` abierto: registros por llave y totales por día. */
export abstract class UsageLedger {
  /** Guarda el registro si su llave es nueva. Devuelve `false` si ya se había registrado. */
  abstract claim(usage: MeteredUsage): Promise<boolean>;

  /** Suma la cantidad al día, o deja el mayor valor si la métrica se reduce por máximo. */
  abstract accumulate(
    day: string,
    metric: UsageMetric,
    quantity: number,
  ): Promise<void>;

  /** Lo usado por métrica entre `from` y `to` (fechas incluidas), según cómo se reduce cada una. */
  abstract levels(from: string, to: string): Promise<readonly UsageLevel[]>;
}
