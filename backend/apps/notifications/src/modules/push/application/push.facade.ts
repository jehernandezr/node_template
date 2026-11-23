import type { UserRef } from '@contracts/platform';
import type { PushMessage } from '../domain/push-message.js';

/** Push para los otros módulos. */
export abstract class PushFacade {
  /** Envía a cada dispositivo del usuario y devuelve cuántos lo aceptaron. */
  abstract deliver(user: UserRef, message: PushMessage): Promise<number>;
}
