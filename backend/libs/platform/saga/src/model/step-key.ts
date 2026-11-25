import { CompensationKey, StepKeyDirection } from '@platform/internal-api';
import { StepDirection } from './step-direction.enum.js';

/** Llave de idempotencia de un paso de saga. */
export class StepKey {
  private static readonly DIRECTIONS: Readonly<
    Record<StepDirection, StepKeyDirection>
  > = {
    [StepDirection.Forward]: StepKeyDirection.Forward,
    [StepDirection.Compensate]: StepKeyDirection.Compensate,
  };

  /**
   * `${sagaId}:${stepIndex}:${direction}`; se reutiliza en cada intento del paso. Sigue la convención de
   * `CompensationKey`, así el participante pone la lápida del paso hacia delante al recibir su compensación.
   */
  static of(
    sagaId: string,
    stepIndex: number,
    direction: StepDirection,
  ): string {
    return CompensationKey.of(
      `${sagaId}:${stepIndex}`,
      StepKey.DIRECTIONS[direction],
    );
  }
}
