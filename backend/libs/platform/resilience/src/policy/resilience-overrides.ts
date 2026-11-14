import type { ResiliencePolicyConfig } from './resilience-policy-config.js';

/**
 * Ajustes por nombre de política, mezclados sobre las políticas base. Una
 * clave sin base y con `timeoutMs` define una política completa; sin
 * `timeoutMs`, espera a que un `register` la complete.
 */
export type ResilienceOverrides = Readonly<
  Record<string, Partial<ResiliencePolicyConfig>>
>;
