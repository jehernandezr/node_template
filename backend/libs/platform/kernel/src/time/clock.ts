/** Source of time. Injecting it allows controlling time in tests. */
export abstract class Clock {
  /**
   * Reads the current instant.
   * @returns The instant.
   */
  abstract now(): Date;
}
