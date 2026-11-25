import type { ResiliencePolicyConfig } from './resilience-policy-config.js';

/**
 * Overrides by policy name, merged over the base policies. A
 * key without a base and with `timeoutMs` defines a complete policy; without
 * `timeoutMs`, it waits for a `register` to complete it.
 */
export type ResilienceOverrides = Readonly<
  Record<string, Partial<ResiliencePolicyConfig>>
>;
