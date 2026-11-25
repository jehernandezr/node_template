import { CompensationKey, StepKeyDirection } from '@platform/internal-api';
import { StepDirection } from './step-direction.enum.js';

/** Idempotency key of a saga step. */
export class StepKey {
  private static readonly DIRECTIONS: Readonly<
    Record<StepDirection, StepKeyDirection>
  > = {
    [StepDirection.Forward]: StepKeyDirection.Forward,
    [StepDirection.Compensate]: StepKeyDirection.Compensate,
  };

  /**
   * `${sagaId}:${stepIndex}:${direction}`; reused on every attempt of the step. Follows the convention of
   * `CompensationKey`, so the participant writes the tombstone of the forward step when it receives its compensation.
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
