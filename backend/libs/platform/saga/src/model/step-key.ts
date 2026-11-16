import type { StepDirection } from './step-direction.enum.js';

/** Llave de idempotencia de un paso de saga. */
export class StepKey {
  /** `${sagaId}:${stepIndex}:${direction}`; se reutiliza en cada intento del paso. */
  static of(
    sagaId: string,
    stepIndex: number,
    direction: StepDirection,
  ): string {
    return `${sagaId}:${stepIndex}:${direction}`;
  }
}
