import { ResilienceNotConfiguredError } from './errors.js';
import type { ResiliencePolicyName } from './policy-name.js';
import { ResilienceRegistry } from './registry.js';

/** Options for {@link Resilient}. */
export interface ResilientOptions {
  /** Allow retries. Only set when repeating the call has no side effects. Default false. */
  readonly idempotent?: boolean;
  /** Dependency whose breaker and bulkhead are used. Default: the policy name. */
  readonly dependencyKey?: string;
}

/**
 * Legacy method decorator: runs an async method through the default registry's
 * policy `name`. The method receives the per-attempt `AbortSignal` as an extra
 * last argument, so adapters can cancel work; callers do not pass it.
 * Rejects with `ResilienceNotConfiguredError` when no default registry is set.
 * @param name Policy to apply to the method.
 * @param options Retry and dependency options.
 */
export function Resilient(
  name: ResiliencePolicyName,
  options: ResilientOptions = {},
) {
  return function <R>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: never[]) => Promise<R>>,
  ): void {
    const original = descriptor.value as
      ((this: unknown, ...args: unknown[]) => Promise<R>) | undefined;
    if (!original) {
      throw new ResilienceNotConfiguredError(
        `@Resilient(${name}) can only decorate methods`,
        name,
      );
    }
    descriptor.value = function (
      this: unknown,
      ...args: unknown[]
    ): Promise<R> {
      const registry = ResilienceRegistry.getDefault();
      if (!registry) {
        return Promise.reject(
          new ResilienceNotConfiguredError(
            `@Resilient(${name}): no default ResilienceRegistry set; call ResilienceRegistry.setDefault first`,
            name,
          ),
        );
      }
      return registry.execute<R>(
        name,
        (signal) => original.call(this, ...args, signal),
        {
          idempotent: options.idempotent,
          dependencyKey: options.dependencyKey,
        },
      );
    } as (...args: never[]) => Promise<R>;
  };
}
