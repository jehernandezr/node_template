import type { PolicyName } from '../policy/policy-name.js';

/** Token de las opciones del módulo. */
export const RESILIENCE_OPTIONS = Symbol('RESILIENCE_OPTIONS');
/** Token de la métrica que recibe los eventos de resiliencia. */
export const RESILIENCE_METRICS = Symbol('RESILIENCE_METRICS');

/** Tokens de los registros de política por servicio. */
export class ResilienceTokens {
  static registration(name: PolicyName): symbol {
    return Symbol.for(`platform.resilience.policy.${name.value}`);
  }
}

/** Token del registro de una política declarada con `forFeature`. */
export const policyRegistrationToken = ResilienceTokens.registration;
