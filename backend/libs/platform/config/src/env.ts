import { z } from 'zod';

export interface EnvNumberOptions {
  min?: number;
  max?: number;
}

/** `'true' | 'false' | '1' | '0'`, case-insensitive and ignoring surrounding whitespace. */
export function envBoolean() {
  return z.string().transform((value, ctx) => {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    ctx.addIssue({
      code: 'custom',
      message: "expected 'true', 'false', '1' or '0'",
    });
    return z.NEVER;
  });
}

/** Finite number read from text, with optional inclusive bounds. */
export function envNumber(options: EnvNumberOptions = {}) {
  const { min, max } = options;
  return z.string().transform((value, ctx) => {
    const trimmed = value.trim();
    const parsed = trimmed === '' ? Number.NaN : Number(trimmed);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: 'custom', message: 'expected a finite number' });
      return z.NEVER;
    }
    if (min !== undefined && parsed < min) {
      ctx.addIssue({ code: 'custom', message: `expected a number >= ${min}` });
      return z.NEVER;
    }
    if (max !== undefined && parsed > max) {
      ctx.addIssue({ code: 'custom', message: `expected a number <= ${max}` });
      return z.NEVER;
    }
    return parsed;
  });
}

/** Comma-separated list. Entries are trimmed and empty ones discarded; `''` yields `[]`. */
export function envList() {
  return z.string().transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

const DURATION_UNITS_MS: Readonly<Record<string, number>> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const DURATION_PATTERN = /^(?<amount>\d+)(?<unit>ms|s|m|h|d)$/;

/** Duration such as `500ms`, `5s`, `10m`, `1h` or `2d`, in milliseconds. */
export function envDuration() {
  return z.string().transform((value, ctx) => {
    const groups = DURATION_PATTERN.exec(value.trim())?.groups;
    if (groups === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'expected a duration such as 500ms, 5s, 10m, 1h or 2d',
      });
      return z.NEVER;
    }
    return Number(groups['amount']) * DURATION_UNITS_MS[groups['unit']];
  });
}
