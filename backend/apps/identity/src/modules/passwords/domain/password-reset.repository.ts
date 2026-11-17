import type { PasswordReset } from './password-reset.js';

/** Recuperaciones de contraseña de un usuario, en su shard. El caso de uso abre el `ShardScope`. */
export abstract class PasswordResetRepository {
  abstract insert(reset: PasswordReset): Promise<void>;

  /**
   * La recuperación bloqueada hasta el fin de la transacción abierta, o `undefined` si no existe o es de
   * otro usuario: dos confirmaciones simultáneas del mismo token no pueden usarlo las dos.
   */
  abstract findForUpdate(
    userId: string,
    resetId: string,
  ): Promise<PasswordReset | undefined>;

  /** @throws OptimisticLockError si otra escritura cambió la recuperación. */
  abstract update(reset: PasswordReset): Promise<void>;
}
