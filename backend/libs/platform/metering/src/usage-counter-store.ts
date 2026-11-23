import type { UsageWindow } from './usage-count.js';

/** Contadores de uso por ventana, compartidos por todas las instancias del servicio. */
export abstract class UsageCounterStore {
  /** Suma `quantity` al contador del tenant y la métrica en la ventana que empieza en `windowStart`. */
  abstract add(
    windowStart: Date,
    tenantId: string,
    metric: string,
    quantity: number,
  ): Promise<void>;

  /** Las ventanas que empezaron antes de `before` y todavía no se vaciaron, de la más vieja a la más nueva. */
  abstract pending(before: Date): Promise<readonly UsageWindow[]>;

  /** Olvida la ventana: ya se envió completa. */
  abstract clear(windowStart: Date): Promise<void>;
}
