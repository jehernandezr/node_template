import { createHash } from 'node:crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (record[key] !== undefined) {
        sorted[key] = canonicalize(record[key]);
      }
    }
    return sorted;
  }
  return value;
}

/** SHA-256 of the canonical JSON (sorted keys) of an input. */
export function hashInput(input: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(input)) ?? 'null')
    .digest('hex');
}
