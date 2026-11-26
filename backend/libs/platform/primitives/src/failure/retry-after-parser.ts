import type { Clock } from '@platform/kernel';
import { PrimitivesGuard } from '../errors/primitives-guard.js';

/** Interprets the wait suggested by a server in `Retry-After`. */
export class RetryAfterParser {
  /** Default cap of the suggested wait. */
  static readonly DEFAULT_MAX_MS = 60_000;

  /** Maximum length of a header that is parsed. */
  private static readonly MAX_LENGTH = 64;

  private static readonly DELAY_SECONDS = /^\d{1,10}$/;

  constructor(
    private readonly clock: Clock,
    readonly maxMs: number = RetryAfterParser.DEFAULT_MAX_MS,
  ) {
    PrimitivesGuard.instance.nonNegativeFinite('maxMs', maxMs);
  }

  /**
   * Returns the suggested wait in milliseconds, bounded to `[0, maxMs]`. Accepts the
   * header (integer seconds or HTTP date), seconds as a number or a date.
   * @returns `undefined` if the value is missing or cannot be parsed.
   */
  parse(value: string | number | Date | null | undefined): number | undefined {
    const delay = this.rawDelayMs(value);
    if (delay === undefined || Number.isNaN(delay)) {
      return undefined;
    }
    return Math.min(this.maxMs, Math.max(0, Math.ceil(delay)));
  }

  /**
   * Only an HTTP date with a day name (IMF-fixdate, RFC 850 or asctime); prevents Date.parse from accepting loose numbers or other ambiguous formats.
   */
  private rawDelayMs(
    value: string | number | Date | null | undefined,
  ): number | undefined {
    const nowMs = this.clock.now().getTime();
    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0 ? value * 1000 : undefined;
    }
    if (value instanceof Date) {
      return value.getTime() - nowMs;
    }
    if (
      typeof value !== 'string' ||
      value.length > RetryAfterParser.MAX_LENGTH
    ) {
      return undefined;
    }
    const trimmed = value.trim();
    if (RetryAfterParser.DELAY_SECONDS.test(trimmed)) {
      return Number(trimmed) * 1000;
    }
    if (!/^[A-Za-z]{3}/.test(trimmed)) {
      return undefined;
    }
    const at = Date.parse(trimmed);
    return Number.isNaN(at) ? undefined : at - nowMs;
  }
}
