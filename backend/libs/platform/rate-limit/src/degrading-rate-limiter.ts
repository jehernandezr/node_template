import { SystemClock } from '@platform/kernel';
import { PrimitivesGuard } from '@platform/primitives';
import type { DegradingRateLimiterOptions } from './degrading-rate-limiter.options.js';
import { InMemoryRateLimiter } from './in-memory-rate-limiter.js';
import type { RateLimitDegradationReporter } from './rate-limit-degradation-reporter.js';
import type { RateLimitDegradedListener } from './rate-limit-degraded-listener.js';
import { RateLimitOperation } from './rate-limit-operation.enum.js';
import type { RateLimitResult } from './rate-limit-result.js';
import type { RateLimitRule } from './rate-limit-rule.js';
import { RateLimitCallValidator } from './rate-limit-call-validator.js';
import { NoopRateLimitDegradationReporter } from './noop-rate-limit-degradation-reporter.js';
import { RateLimiter } from './rate-limiter.js';

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
  private readonly reporter: RateLimitDegradationReporter;

  /** @throws InvalidArgumentError si `localDivisor` no es un entero positivo. */
  constructor(options: DegradingRateLimiterOptions) {
    super();
    this.localDivisor = PrimitivesGuard.instance.positiveInteger(
      'localDivisor',
      options.localDivisor,
    );
    this.primary = options.primary;
    this.fallback =
      options.fallback ??
      new InMemoryRateLimiter({ clock: options.clock ?? new SystemClock() });
    this.onDegraded = options.onDegraded;
    this.reporter = options.reporter ?? new NoopRateLimitDegradationReporter();
  }

  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    RateLimitCallValidator.validate(key, rule, cost);
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
    RateLimitCallValidator.validate(key, rule);
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
    RateLimitCallValidator.validate(key, rule);
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
    try {
      this.reporter.degraded(operation, rule, error);
    } catch {
      // El reporte es diagnóstico: no debe cambiar la respuesta del limitador.
    }
  }
}
