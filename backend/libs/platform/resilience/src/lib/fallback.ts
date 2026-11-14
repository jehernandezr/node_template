/**
 * Runs `operation` and, if it rejects, returns the value produced by `fallback`.
 * @param operation Primary operation. @param fallback Receives the error and returns a degraded value.
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: (error: unknown) => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    return fallback(error);
  }
}
