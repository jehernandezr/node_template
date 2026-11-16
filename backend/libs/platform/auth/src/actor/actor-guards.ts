import { ActorType } from '@platform/observability';
import type {
  Actor,
  ServiceAccountActor,
  SystemActor,
  UserActor,
} from './actor.js';

/** Estrechamiento de tipo del `Actor` por su `kind`. */
export class ActorGuards {
  static isUser(actor: Actor): actor is UserActor {
    return actor.kind === ActorType.User;
  }

  static isServiceAccount(actor: Actor): actor is ServiceAccountActor {
    return actor.kind === ActorType.ServiceAccount;
  }

  static isSystem(actor: Actor): actor is SystemActor {
    return actor.kind === ActorType.System;
  }
}
