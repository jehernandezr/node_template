import { StepKeyDirection } from './step-key-direction.enum.js';

/**
 * Convention for keys shared by a step and its compensation: `<base>:forward` and `<base>:compensate`, with the same
 * base. Sagas use it when calling and the server uses it to place the tombstone of the step being undone.
 */
export class CompensationKey {
  /** Tombstone hash: no real input produces it, so a claim with it is never mistaken for a step. */
  static readonly TOMBSTONE_FINGERPRINT = 'compensated-step-tombstone';
  private static readonly SEPARATOR = ':';

  /**
   * Returns the key of `base` in the given direction.
   * @param base Base key of the step.
   * @param direction Forward or compensation.
   * @returns The key.
   */
  static of(base: string, direction: StepKeyDirection): string {
    return `${base}${CompensationKey.SEPARATOR}${direction}`;
  }

  /**
   * Returns the forward key that a compensation key undoes, or `undefined` if it does not follow the convention.
   * @param key Compensation key.
   * @returns The forward key, or `undefined`.
   */
  static forwardOf(key: string): string | undefined {
    const suffix = `${CompensationKey.SEPARATOR}${StepKeyDirection.Compensate}`;
    if (!key.endsWith(suffix) || key.length === suffix.length) {
      return undefined;
    }
    return CompensationKey.of(
      key.slice(0, -suffix.length),
      StepKeyDirection.Forward,
    );
  }
}
