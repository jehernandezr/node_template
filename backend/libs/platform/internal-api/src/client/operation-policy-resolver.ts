import { ExternalApiPolicy } from './external-api-policy.js';
import { PolicyName, type ResilienceRegistry } from '@platform/resilience';
import type { OperationMetadata } from '../contract/operation-metadata.js';

/** Chooses the resilience policy an operation is called with. */
export class OperationPolicyResolver {
  private readonly derived = new Map<string, PolicyName>();

  constructor(private readonly resilience: ResilienceRegistry) {}

  /**
   * An operation without its own `retry` or `timeoutMs` uses `ExternalApiPolicy.NAME`.
   * One with its own uses a derived policy named
   * `external-api.t<timeoutMs>.a<maxAttempts>.b<baseMs>.m<maxMs>` (effective values),
   * registered the first time with `resilience.register` on top of `ExternalApiPolicy.CONFIG`
   * with that `timeoutMs` and that `RetryPolicy`. The registered configuration is
   * stored by name in the instance: the registry compares by reference and
   * does not allow registering the same name twice with different objects.
   * @param metadata Operation metadata.
   * @returns The policy name.
   */
  resolve(metadata: OperationMetadata): PolicyName {
    if (metadata.retry === undefined && metadata.timeoutMs === undefined) {
      return ExternalApiPolicy.NAME;
    }
    const timeoutMs = metadata.attemptTimeoutMs();
    const retry = metadata.retryPolicy();
    const value = `${ExternalApiPolicy.NAME.value}.t${timeoutMs}.a${retry.maxAttempts}.b${retry.baseMs}.m${retry.maxMs}`;
    const known = this.derived.get(value);
    if (known !== undefined) {
      return known;
    }
    const name = PolicyName.of(value);
    this.resilience.register(name, {
      ...ExternalApiPolicy.CONFIG,
      timeoutMs,
      retry: { policy: retry },
    });
    this.derived.set(value, name);
    return name;
  }
}
