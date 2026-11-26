import { type Clock } from '@platform/kernel';
import { RateLimitArgumentGuard } from './errors/rate-limit-argument-guard.js';
import type { InMemoryRateLimiterOptions } from './in-memory-rate-limiter.options.js';
import type { RateLimitResult } from './rate-limit-result.js';
import type { RateLimitRule } from './rate-limit-rule.js';
import { RateLimitCallValidator } from './rate-limit-call-validator.js';
import { RateLimiter } from './rate-limiter.js';
import { SlidingWindow } from './sliding-window.js';
import type { WindowCounts } from './window-counts.js';
import type { WindowPosition } from './window-position.js';

/** Counters of a key: window index and counts. */
interface Entry {
  index: number;
  previous: number;
  current: number;
}

/**
 * {@link RateLimiter} local to a process. It suits a single process,
 * tests and as a fallback for `DegradingRateLimiter` when the shared
 * limiter fails.
 * The Map insertion order is the usage order: each access reinserts.
 */
export class InMemoryRateLimiter extends RateLimiter {
  /** Keys it stores by default. */
  static readonly DEFAULT_MAX_ENTRIES = 100_000;

  private readonly entries = new Map<string, Entry>();
  private readonly clock: Clock;
  private readonly maxEntries: number;

  /** @throws InvalidArgumentError if `maxEntries` is not a positive integer. */
  constructor(options: InMemoryRateLimiterOptions) {
    super();
    this.maxEntries = RateLimitArgumentGuard.instance.positiveInteger(
      'maxEntries',
      options.maxEntries ?? InMemoryRateLimiter.DEFAULT_MAX_ENTRIES,
    );
    this.clock = options.clock;
  }

  /**
   * Also when rejecting: a key that insists is the last one worth forgetting.
   */
  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    RateLimitCallValidator.validate(key, rule, cost);
    const id = InMemoryRateLimiter.entryId(key, rule);
    const { position, counts } = this.read(id, rule);
    const allowed = SlidingWindow.admits(counts, position, rule, cost);
    const next: Entry = {
      index: position.index,
      previous: counts.previous,
      current: counts.current + (allowed ? cost : 0),
    };
    this.entries.delete(id);
    this.entries.set(id, next);
    this.evict();
    return SlidingWindow.result(next, position, rule, allowed, cost);
  }

  async peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    RateLimitCallValidator.validate(key, rule);
    const { position, counts } = this.read(
      InMemoryRateLimiter.entryId(key, rule),
      rule,
    );
    return SlidingWindow.result(
      counts,
      position,
      rule,
      SlidingWindow.admits(counts, position, rule, 1),
      1,
    );
  }

  async reset(key: string, rule: RateLimitRule): Promise<void> {
    RateLimitCallValidator.validate(key, rule);
    this.entries.delete(InMemoryRateLimiter.entryId(key, rule));
  }

  /**
   * Identity of the counters: name, window and key. The separator cannot
   * appear in the name or the window, so two keys do not collide.
   */
  private static entryId(key: string, rule: RateLimitRule): string {
    return `${rule.name}\u0000${rule.windowMs}\u0000${key}`;
  }

  /**
   * Counts of the current window, shifting the windows that already passed.
   * The clock went back: it stays in the stored window, from its start.
   */
  private read(
    id: string,
    rule: RateLimitRule,
  ): { position: WindowPosition; counts: WindowCounts } {
    const now = SlidingWindow.position(
      this.clock.now().getTime(),
      rule.windowMs,
    );
    const entry = this.entries.get(id);
    if (entry === undefined) {
      return { position: now, counts: { previous: 0, current: 0 } };
    }
    if (entry.index > now.index) {
      return {
        position: { index: entry.index, elapsedMs: 0 },
        counts: entry,
      };
    }
    if (entry.index === now.index) {
      return { position: now, counts: entry };
    }
    const previous = entry.index === now.index - 1 ? entry.current : 0;
    return { position: now, counts: { previous, current: 0 } };
  }

  private evict(): void {
    for (const id of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) {
        return;
      }
      this.entries.delete(id);
    }
  }
}
