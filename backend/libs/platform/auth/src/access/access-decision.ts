import type { AccessOutcome } from './access-outcome.enum.js';

/** Decisión del evaluador de acceso. `Forbidden`, `FeatureNotIncluded` y `StepUpRequired` indican qué faltó, sin datos del usuario. */
export type AccessDecision =
  | { readonly outcome: AccessOutcome.Allowed }
  | {
      readonly outcome: AccessOutcome.Forbidden;
      /** Permisos o roles de plataforma que el actor no tiene. */
      readonly missing: readonly string[];
    }
  | {
      readonly outcome: AccessOutcome.FeatureNotIncluded;
      /** Funcionalidades del plan que el tenant no tiene. */
      readonly missing: readonly string[];
    }
  | { readonly outcome: AccessOutcome.FlagDisabled }
  | { readonly outcome: AccessOutcome.StepUpRequired };
