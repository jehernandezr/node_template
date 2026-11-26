import { ActorType } from '@platform/observability';
import type {
  Actor,
  ServiceAccountActor,
  SystemActor,
  UserActor,
} from './actor.js';

/** Type narrowing of the `Actor` by its `kind`. */
export class ActorGuards {
  /**
   * Tells whether the actor is a signed-in user.
   * @param actor Actor to check.
   * @returns `true` for a user.
   */
  static isUser(actor: Actor): actor is UserActor {
    return actor.kind === ActorType.User;
  }

  /**
   * Tells whether the actor is a service account with an API key.
   * @param actor Actor to check.
   * @returns `true` for a service account.
   */
  static isServiceAccount(actor: Actor): actor is ServiceAccountActor {
    return actor.kind === ActorType.ServiceAccount;
  }

  /**
   * Tells whether the actor is the system itself, such as a job.
   * @param actor Actor to check.
   * @returns `true` for the system.
   */
  static isSystem(actor: Actor): actor is SystemActor {
    return actor.kind === ActorType.System;
  }
}
