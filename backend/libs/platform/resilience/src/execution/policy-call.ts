import type { PolicyName } from '../policy/policy-name.js';
import type { DependencyEntry } from '../policy/dependency-entry.js';
import type { ResiliencePolicyConfig } from '../policy/resilience-policy-config.js';
import type {
  ResilienceCallOptions,
  ResilientOperation,
} from './resilience-call.options.js';

/** A call already resolved against its policy, ready for the executor. */
export interface PolicyCall<T> {
  readonly name: PolicyName;
  readonly dependencyKey: string;
  readonly config: ResiliencePolicyConfig;
  readonly entry: DependencyEntry;
  readonly fn: ResilientOperation<T>;
  readonly options: ResilienceCallOptions;
}
