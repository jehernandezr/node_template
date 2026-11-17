import type { UserLookup } from './user-lookup.js';

/** Índice global de emails en el catálogo (`identity_lookup`): un email por plataforma. */
export abstract class UserDirectory {
  /** Reserva el email. Devuelve `false` si ya lo tiene otro usuario. */
  abstract reserve(lookup: UserLookup): Promise<boolean>;

  abstract activate(fingerprint: Buffer): Promise<void>;

  /** Libera una reserva que no llegó a tener usuario. */
  abstract release(fingerprint: Buffer, userId: string): Promise<void>;

  abstract findByFingerprint(
    fingerprint: Buffer,
  ): Promise<UserLookup | undefined>;

  abstract findByUserId(userId: string): Promise<UserLookup | undefined>;

  /** Mueve la entrada al email nuevo. Devuelve `false` si el email nuevo ya es de otro usuario. */
  abstract moveEmail(
    userId: string,
    from: Buffer,
    to: Buffer,
  ): Promise<boolean>;

  /** Borra las reservas anteriores a `before`. Devuelve cuántas borró. */
  abstract sweepReserved(before: Date): Promise<number>;
}
