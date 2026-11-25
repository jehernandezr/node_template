import type { AccessRequirement } from '@contracts/platform';
import type { Actor } from '../actor/actor.js';
import type { AccessGrant } from './access-grant.js';

/** Input of `AccessEvaluator.evaluate`. */
export interface AccessEvaluation {
  readonly requirement: AccessRequirement;
  readonly actor: Actor;
  /** For a `ServiceAccountActor` it is the grant the caller builds with the permissions of its API key. */
  readonly grant: AccessGrant;
  /** Instant of the evaluation, from `Clock`. */
  readonly now: Date;
}
