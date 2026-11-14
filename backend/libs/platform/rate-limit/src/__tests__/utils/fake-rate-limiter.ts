import type { Clock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryRateLimiter } from '../../in-memory-rate-limiter.js';
import { RateLimitOperation } from '../../rate-limit-operation.enum.js';
import type { RateLimitResult } from '../../rate-limit-result.js';
import type { RateLimitRule } from '../../rate-limit-rule.js';
import { RateLimitCallValidator } from '../../rate-limit-call-validator.js';
import { RateLimiter } from '../../rate-limiter.js';

/** Una llamada que recibió un {@link FakeRateLimiter}. */
export interface RateLimiterCall {
  readonly operation: RateLimitOperation;
  readonly key: string;
  readonly rule: RateLimitRule;
  /** Costo de `consume`; 1 en `peek` y `reset`. */
  readonly cost: number;
}

/**
 * {@link RateLimiter} para pruebas. Cuenta como `InMemoryRateLimiter` sobre un
 * reloj de prueba, guarda cada llamada y permite forzar rechazos o fallas.
 */
export class FakeRateLimiter extends RateLimiter {
  /** Llamadas recibidas, en orden. Las inválidas no se guardan. */
  readonly calls: RateLimiterCall[] = [];
  /** Reloj de los contadores, para avanzar el tiempo desde la prueba. */
  readonly clock: Clock;
  private readonly inner: InMemoryRateLimiter;
  private readonly blocked = new Set<string>();
  private failure: { error: unknown } | undefined;

  constructor(clock: Clock = new FixedClock()) {
    super();
    this.clock = clock;
    this.inner = new InMemoryRateLimiter({ clock });
  }

  /** Rechaza todo `consume` y `peek` de la llave, en cualquier regla. */
  block(key: string): void {
    this.blocked.add(key);
  }

  unblock(key: string): void {
    this.blocked.delete(key);
  }

  /**
   * Hace que toda llamada válida lance `error`, como un Valkey caído. Sin
   * argumento vuelve a responder normalmente.
   */
  failWith(error?: unknown): void {
    this.failure = error === undefined ? undefined : { error };
  }

  /** Llamadas de una operación. */
  callsOf(operation: RateLimitOperation): RateLimiterCall[] {
    return this.calls.filter((call) => call.operation === operation);
  }

  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    this.record(RateLimitOperation.Consume, key, rule, cost);
    return this.blocked.has(key)
      ? blockedResult(rule)
      : this.inner.consume(key, rule, cost);
  }

  async peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    this.record(RateLimitOperation.Peek, key, rule, 1);
    return this.blocked.has(key)
      ? blockedResult(rule)
      : this.inner.peek(key, rule);
  }

  async reset(key: string, rule: RateLimitRule): Promise<void> {
    this.record(RateLimitOperation.Reset, key, rule, 1);
    await this.inner.reset(key, rule);
  }

  private record(
    operation: RateLimitOperation,
    key: string,
    rule: RateLimitRule,
    cost: number,
  ): void {
    RateLimitCallValidator.validate(key, rule, cost);
    this.calls.push({ operation, key, rule, cost });
    if (this.failure !== undefined) {
      throw this.failure.error;
    }
  }
}

/** Respuesta de una llave bloqueada: sin cupo durante una ventana entera. */
function blockedResult(rule: RateLimitRule): RateLimitResult {
  return {
    allowed: false,
    count: rule.limit,
    remaining: 0,
    retryAfterMs: rule.windowMs,
  };
}
