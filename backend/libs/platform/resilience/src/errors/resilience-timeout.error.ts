import type { ResilienceErrorOptions } from './resilience-error.js';
import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';
import { TimeoutScope } from './timeout-scope.enum.js';

/** Un intento o la llamada completa se quedaron sin tiempo. */
export class ResilienceTimeoutError extends ResilienceError {
  readonly scope: TimeoutScope;
  readonly timeoutMs: number;

  constructor(
    policy: string,
    scope: TimeoutScope,
    timeoutMs: number,
    options: ResilienceErrorOptions = {},
  ) {
    super(ResilienceErrorCode.Timeout, `Call to policy "${policy}" timed out`, {
      ...options,
      details: { policy, scope, timeoutMs },
    });
    this.scope = scope;
    this.timeoutMs = timeoutMs;
  }
}
