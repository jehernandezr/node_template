import type { FixedClock } from '@platform/kernel/test-utils';
import type { RateLimitResult } from '../../rate-limit-result.js';

/** Un paso de la secuencia: avanzar el reloj y pedir `cost` unidades. */
export interface SlidingWindowStep {
  readonly advanceMs: number;
  readonly cost: number;
}

/** Secuencia fija de consumos con avances de reloj, reproducible en cualquier limitador. */
export class SlidingWindowScenario {
  constructor(private readonly steps: readonly SlidingWindowStep[]) {}

  /** Ejecuta cada paso en orden y devuelve la respuesta de cada uno. */
  async run(
    consume: (cost: number) => Promise<RateLimitResult> | RateLimitResult,
    clock: FixedClock,
  ): Promise<RateLimitResult[]> {
    const results: RateLimitResult[] = [];
    for (const step of this.steps) {
      clock.advance(step.advanceMs);
      results.push(await consume(step.cost));
    }
    return results;
  }
}
