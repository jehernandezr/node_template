/** Source of time. Injecting it allows controlling time in tests. */
export abstract class Clock {
  abstract now(): Date;
}
