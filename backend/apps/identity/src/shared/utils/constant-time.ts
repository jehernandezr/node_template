import { timingSafeEqual } from 'node:crypto';

/**
 * Compares two values without revealing how quickly they differ. Different lengths return `false`
 * without throwing: `timingSafeEqual` requires the same length, and the length alone is not secret here.
 */
export function constantTimeEquals(
  a: Uint8Array | string,
  b: Uint8Array | string,
): boolean {
  const left = typeof a === 'string' ? Buffer.from(a, 'utf8') : a;
  const right = typeof b === 'string' ? Buffer.from(b, 'utf8') : b;
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  return timingSafeEqual(left, right);
}
