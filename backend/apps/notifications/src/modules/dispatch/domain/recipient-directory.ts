import type { Recipient } from './recipient.js';

/** Los datos de contacto de un usuario, según identity. */
export abstract class RecipientDirectory {
  /** `undefined` si el usuario no existe o ya se borró: no hay a quién avisar. */
  abstract find(userId: string): Promise<Recipient | undefined>;
}
