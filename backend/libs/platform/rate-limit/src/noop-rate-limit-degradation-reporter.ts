import { RateLimitDegradationReporter } from './rate-limit-degradation-reporter.js';

/** Reporter que descarta las fallas. Es el valor por defecto. */
export class NoopRateLimitDegradationReporter extends RateLimitDegradationReporter {
  degraded(): void {
    // sin efecto
  }
}
