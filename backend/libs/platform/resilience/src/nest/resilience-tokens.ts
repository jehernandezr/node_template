import type { PolicyName } from '../policy/policy-name.js';

/** Token of the module options. */
export const RESILIENCE_OPTIONS = Symbol('RESILIENCE_OPTIONS');
/** Token of the metric that receives the resilience events. */
export const RESILIENCE_METRICS = Symbol('RESILIENCE_METRICS');

/** Tokens of the per-service policy registrations. */
export class ResilienceTokens {
  /**
   * Token of the registration of a policy.
   * @param name Policy name.
   * @returns The token.
   */
  static registration(name: PolicyName): symbol {
    return Symbol.for(`platform.resilience.policy.${name.value}`);
  }
}

/** Token of the registration of a policy declared with `forFeature`. */
export const policyRegistrationToken = ResilienceTokens.registration;
