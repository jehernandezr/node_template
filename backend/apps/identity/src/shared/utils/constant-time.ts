import { timingSafeEqual } from 'node:crypto';

/**
 * Compara dos valores sin revelar en cuánto tiempo se diferencian. Largos distintos devuelven `false`
 * sin lanzar: `timingSafeEqual` exige el mismo largo y el largo, por sí solo, no es secreto aquí.
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
