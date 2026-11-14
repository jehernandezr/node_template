import { SystemClock, type Clock } from '@platform/kernel';
import { InvalidArgumentError } from '@platform/primitives';
import {
  assertRateLimitCall,
  type RateLimitResult,
  type RateLimitRule,
} from './rate-limit-rule.js';
import { RateLimiter } from './rate-limiter.js';
import {
  admits,
  slidingWindowResult,
  windowPosition,
  type WindowCounts,
  type WindowPosition,
} from './sliding-window.js';

/** Llaves que guarda por defecto un {@link InMemoryRateLimiter}. */
export const DEFAULT_IN_MEMORY_RATE_LIMIT_ENTRIES = 100_000;

/** Opciones de {@link InMemoryRateLimiter}. */
export interface InMemoryRateLimiterOptions {
  /** Fuente de tiempo. En pruebas, `FixedClock` de `@platform/kernel/testing`. */
  readonly clock?: Clock;
  /**
   * Llaves que guarda como máximo. Al pasarse olvida la usada hace más tiempo,
   * que vuelve a empezar de cero: así una ráfaga de llaves distintas no agota
   * la memoria del proceso. Por defecto {@link DEFAULT_IN_MEMORY_RATE_LIMIT_ENTRIES}.
   */
  readonly maxEntries?: number;
}

interface Entry {
  index: number;
  previous: number;
  current: number;
}

/**
 * {@link RateLimiter} local a un proceso. Sirve para un solo proceso, para
 * pruebas y como respaldo de `DegradingRateLimiter` cuando el limitador
 * compartido falla.
 */
export class InMemoryRateLimiter extends RateLimiter {
  // El orden de inserción del Map es el orden de uso: cada acceso reinserta.
  private readonly entries = new Map<string, Entry>();
  private readonly clock: Clock;
  private readonly maxEntries: number;

  /** @throws InvalidArgumentError si `maxEntries` no es un entero positivo. */
  constructor(options: InMemoryRateLimiterOptions = {}) {
    super();
    const maxEntries =
      options.maxEntries ?? DEFAULT_IN_MEMORY_RATE_LIMIT_ENTRIES;
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
      throw new InvalidArgumentError('maxEntries', 'a positive integer');
    }
    this.clock = options.clock ?? new SystemClock();
    this.maxEntries = maxEntries;
  }

  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    assertRateLimitCall(key, rule, cost);
    const id = entryId(key, rule);
    const { position, counts } = this.read(id, rule);
    const allowed = admits(counts, position, rule, cost);
    const next: Entry = {
      index: position.index,
      previous: counts.previous,
      current: counts.current + (allowed ? cost : 0),
    };
    // También al rechazar: una llave que insiste es la última que conviene olvidar.
    this.entries.delete(id);
    this.entries.set(id, next);
    this.evict();
    return slidingWindowResult(next, position, rule, allowed, cost);
  }

  async peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    assertRateLimitCall(key, rule);
    const { position, counts } = this.read(entryId(key, rule), rule);
    return slidingWindowResult(
      counts,
      position,
      rule,
      admits(counts, position, rule, 1),
      1,
    );
  }

  async reset(key: string, rule: RateLimitRule): Promise<void> {
    assertRateLimitCall(key, rule);
    this.entries.delete(entryId(key, rule));
  }

  /** Cuentas de la ventana en curso, corriendo las ventanas que ya pasaron. */
  private read(
    id: string,
    rule: RateLimitRule,
  ): { position: WindowPosition; counts: WindowCounts } {
    const now = windowPosition(this.clock.now().getTime(), rule.windowMs);
    const entry = this.entries.get(id);
    if (entry === undefined) {
      return { position: now, counts: { previous: 0, current: 0 } };
    }
    if (entry.index > now.index) {
      // El reloj retrocedió: se sigue en la ventana guardada, desde su inicio.
      return { position: { index: entry.index, elapsedMs: 0 }, counts: entry };
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

/**
 * Identidad de los contadores: nombre, ventana y llave. El separador no puede
 * aparecer en el nombre ni en la ventana, así que dos llaves no chocan.
 */
function entryId(key: string, rule: RateLimitRule): string {
  return `${rule.name}\u0000${rule.windowMs}\u0000${key}`;
}
