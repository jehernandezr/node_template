import type { Abstract, Type } from '@nestjs/common';
import type { MetricsPort } from '@platform/observability';
import type { PolicyName } from '../policy/policy-name.js';
import type { ResilienceOverrides } from '../policy/resilience-overrides.js';
import type { ResiliencePolicyConfig } from '../policy/resilience-policy-config.js';

/** Opciones de `ResilienceModule.forRoot`. */
export interface ResilienceModuleOptions {
  /** Ajustes por nombre de política sobre las base. */
  readonly policies?: ResilienceOverrides;
}

/** Extras de `ResilienceModule.forRoot` que no son opciones del registro. */
export interface ResilienceModuleExtras {
  /** Por defecto, el módulo es global. */
  isGlobal?: boolean;
  /** Puerto de métricas. Su clase debe estar registrada por quien llama. */
  metrics?: Type<MetricsPort> | Abstract<MetricsPort>;
}

/** Opciones de `ResilienceModule.forFeature`. */
export interface ResilienceFeatureOptions {
  readonly name: PolicyName;
  readonly policy: ResiliencePolicyConfig;
}
