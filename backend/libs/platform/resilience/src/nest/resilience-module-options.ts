import type { Abstract, Type } from '@nestjs/common';
import type { MetricsPort } from '@platform/observability';
import type { PolicyName } from '../policy/policy-name.js';
import type { ResilienceOverrides } from '../policy/resilience-overrides.js';
import type { ResiliencePolicyConfig } from '../policy/resilience-policy-config.js';

/** Options of `ResilienceModule.forRoot`. */
export interface ResilienceModuleOptions {
  /** Overrides by policy name over the base ones. */
  readonly policies?: ResilienceOverrides;
}

/** Extras of `ResilienceModule.forRoot` that are not registry options. */
export interface ResilienceModuleExtras {
  /** The module is global by default. */
  isGlobal?: boolean;
  /** Metrics port. Its class must be registered by the caller. */
  metrics?: Type<MetricsPort> | Abstract<MetricsPort>;
}

/** Options of `ResilienceModule.forFeature`. */
export interface ResilienceFeatureOptions {
  readonly name: PolicyName;
  readonly policy: ResiliencePolicyConfig;
}
