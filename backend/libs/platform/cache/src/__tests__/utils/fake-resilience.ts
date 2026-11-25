import { FixedClock } from '@platform/kernel/test-utils';
import type {
  PolicyName,
  ResilienceCallOptions,
  ResilientOperation,
} from '@platform/resilience';
import { Deadline } from '@platform/primitives';
import type { CacheResilience } from '../../cache-aside.options.js';

/**
 * Test resilience: runs the operation without retries or circuit and
 * records the policy name and the dependency key of each call.
 */
export class FakeResilience implements CacheResilience {
  readonly names: string[] = [];
  readonly dependencyKeys: (string | undefined)[] = [];
  private failure: Error | undefined;

  /** Makes `execute` reject without running the operation. */
  failWith(error: Error): void {
    this.failure = error;
  }

  async execute<T>(
    name: PolicyName,
    fn: ResilientOperation<T>,
    options: ResilienceCallOptions = {},
  ): Promise<T> {
    this.names.push(name.value);
    this.dependencyKeys.push(options.dependencyKey);
    if (this.failure !== undefined) {
      throw this.failure;
    }
    return fn(new AbortController().signal, {
      number: 1,
      deadline: Deadline.after(60_000, new FixedClock()),
    });
  }
}
