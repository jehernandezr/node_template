import { PolicyName, type ResiliencePolicyConfig } from '@platform/resilience';
import { OperationMetadata } from '../contract/operation-metadata.js';

/**
 * Resilience policy for outgoing service-to-service calls. The
 * `InternalApiModule` registers it with `ResilienceModule.forFeature`. The breaker
 * is per target service: the `InternalClient` uses the first segment of the
 * operation id as `dependencyKey`.
 */
export class ExternalApiPolicy {
  static readonly NAME = PolicyName.of('external-api');

  /**
   * Attempt time and retries of an operation that does not declare its own.
   * They come from `OperationMetadata` so the default call budget
   * (`callBudgetMs`) and what the policy actually does do not diverge.
   */
  static readonly CONFIG: ResiliencePolicyConfig = {
    timeoutMs: OperationMetadata.DEFAULT_TIMEOUT_MS,
    retry: { policy: OperationMetadata.DEFAULT_RETRY_POLICY },
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 30_000 },
  };
}
