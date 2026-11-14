/**
 * Decides whether a request should emit debug logs.
 * `rate` is a probability between 0 and 1 (0 never, 1 always).
 * `random` is injectable to make the decision deterministic in tests.
 */
export function shouldSampleDebug(
  rate: number,
  random: () => number = Math.random,
): boolean {
  if (!(rate > 0)) {
    return false;
  }
  if (rate >= 1) {
    return true;
  }
  return random() < rate;
}
