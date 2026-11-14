import { SystemClock, type Clock } from '@platform/kernel';
import { InvalidArgumentError } from '@platform/primitives';
import { InMemoryRateLimiter } from './in-memory-rate-limiter.js';
import {
  assertRateLimitCall,
  RateLimitOperation,
  type RateLimitResult,
  type RateLimitRule,
} from './rate-limit-rule.js';
import { RateLimiter } from './rate-limiter.js';

/** Aviso de que el limitador compartido falló y respondió el local. */
export type RateLimitDegradedListener = (
  operation: RateLimitOperation,
  rule: RateLimitRule,
  error: unknown,
) => void;

/** Opciones de {@link DegradingRateLimiter}. */
export interface DegradingRateLimiterOptions {
  /** Limitador compartido entre instancias, normalmente el de Valkey. */
  readonly primary: RateLimiter;
  /**
   * Divide el límite de cada regla mientras responde el limitador local, por
   * lo general el número de instancias del servicio: cada una cuenta solo su
   * tráfico, y entre todas no deberían pasar mucho más del límite global.
   */
  readonly localDivisor: number;
  /** Limitador local. Por defecto un `InMemoryRateLimiter` con `clock`. */
  readonly fallback?: RateLimiter;
  /** Reloj del limitador local por defecto. */
  readonly clock?: Clock;
  /**
   * Se llama con cada falla del limitador compartido, para registrarla o
   * medirla. Una excepción dentro de él se ignora.
   */
  readonly onDegraded?: RateLimitDegradedListener;
}

/**
 * {@link RateLimiter} que usa el limitador compartido y, si este falla, uno
 * local con el límite dividido por `localDivisor`. Un servicio sin Valkey
 * sigue limitando, más flojo, en lugar de rechazar todo o de no limitar.
 *
 * Cualquier falla del compartido degrada, porque los argumentos ya se
 * validaron antes de llamarlo. Para no esperar el tiempo agotado de cada
 * llamada mientras Valkey está caído, conviene que `primary` pase por un
 * circuit breaker.
 */
export class DegradingRateLimiter extends RateLimiter {
  private readonly primary: RateLimiter;
  private readonly fallback: RateLimiter;
  private readonly localDivisor: number;
  private readonly onDegraded: RateLimitDegradedListener | undefined;

  /** @throws InvalidArgumentError si `localDivisor` no es un entero positivo. */
  constructor(options: DegradingRateLimiterOptions) {
    super();
    if (
      !Number.isSafeInteger(options.localDivisor) ||
      options.localDivisor < 1
    ) {
      throw new InvalidArgumentError('localDivisor', 'a positive integer');
    }
    this.primary = options.primary;
    this.localDivisor = options.localDivisor;
    this.fallback =
      options.fallback ??
      new InMemoryRateLimiter({ clock: options.clock ?? new SystemClock() });
    this.onDegraded = options.onDegraded;
  }

  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    assertRateLimitCall(key, rule, cost);
    try {
      return await this.primary.consume(key, rule, cost);
    } catch (error) {
      this.degraded(RateLimitOperation.Consume, rule, error);
      const local = this.localRule(rule);
      // Un costo que el límite local no admite nunca cabría: se acota.
      return this.fallback.consume(key, local, Math.min(cost, local.limit));
    }
  }

  async peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    assertRateLimitCall(key, rule);
    try {
      return await this.primary.peek(key, rule);
    } catch (error) {
      this.degraded(RateLimitOperation.Peek, rule, error);
      return this.fallback.peek(key, this.localRule(rule));
    }
  }

  /**
   * Borra en los dos limitadores. Si el compartido falla solo se avisa: quien
   * resetea (por ejemplo, tras un inicio de sesión exitoso) no debe fallar
   * por eso, y el contador viejo vence solo con su ventana.
   */
  async reset(key: string, rule: RateLimitRule): Promise<void> {
    assertRateLimitCall(key, rule);
    await this.fallback.reset(key, this.localRule(rule));
    try {
      await this.primary.reset(key, rule);
    } catch (error) {
      this.degraded(RateLimitOperation.Reset, rule, error);
    }
  }

  /** La regla que aplica el limitador local. Conserva nombre y ventana. */
  private localRule(rule: RateLimitRule): RateLimitRule {
    return {
      name: rule.name,
      windowMs: rule.windowMs,
      limit: Math.max(1, Math.floor(rule.limit / this.localDivisor)),
    };
  }

  private degraded(
    operation: RateLimitOperation,
    rule: RateLimitRule,
    error: unknown,
  ): void {
    try {
      this.onDegraded?.(operation, rule, error);
    } catch {
      // El aviso es diagnóstico: no debe cambiar la respuesta del limitador.
    }
  }
}
