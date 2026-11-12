import { createHash } from 'node:crypto';

/**
 * Serializes a value as JSON with object keys sorted at every level,
 * so equal structures produce the same string regardless of key order.
 */
export function stableStringify(value: unknown): string {
  const text: string | undefined = JSON.stringify(sortKeys(value));
  return text ?? 'null';
}

/**
 * SHA-256 digest of the stable serialization, as 32 lowercase hex characters.
 * Used for building cache keys from query parameters.
 */
export function stableDigest(value: unknown): string {
  return createHash('sha256')
    .update(stableStringify(value))
    .digest('hex')
    .slice(0, 32);
}

/** FNV-1a 32-bit hash of the UTF-8 bytes of `text`, as 8 lowercase hex characters. Not used for keys. */
export function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** FNV-1a hash of the stable serialization of any JSON-like value. */
export function stableHash(value: unknown): string {
  return fnv1a32(stableStringify(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const withToJson = value as { toJSON?: () => unknown };
    if (typeof withToJson.toJSON === 'function') {
      return sortKeys(withToJson.toJSON());
    }
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const child = source[key];
      if (
        child !== undefined &&
        typeof child !== 'function' &&
        typeof child !== 'symbol'
      ) {
        sorted[key] = sortKeys(child);
      }
    }
    return sorted;
  }
  return value;
}
