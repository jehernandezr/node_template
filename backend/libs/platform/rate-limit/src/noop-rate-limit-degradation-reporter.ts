import { RateLimitDegradationReporter } from './rate-limit-degradation-reporter.js';

/** Reporter that discards failures. It is the default value. */
export class NoopRateLimitDegradationReporter extends RateLimitDegradationReporter {
  degraded(): void {
    // no effect
  }
}
