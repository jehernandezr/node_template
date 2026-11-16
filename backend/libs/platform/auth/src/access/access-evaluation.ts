import type { AccessRequirement } from '@contracts/platform';
import type { Actor } from '../actor/actor.js';
import type { AccessGrant } from './access-grant.js';

/** Entrada de `AccessEvaluator.evaluate`. */
export interface AccessEvaluation {
  readonly requirement: AccessRequirement;
  readonly actor: Actor;
  /** Para un `ServiceAccountActor` es el grant que arma el llamador con los permisos de su API key. */
  readonly grant: AccessGrant;
  /** Instante de la evaluación, de `Clock`. */
  readonly now: Date;
}
