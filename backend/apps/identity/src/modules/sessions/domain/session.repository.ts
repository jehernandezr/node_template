import type { Session } from './session.js';

/** Sesiones de un usuario, en el shard del usuario. El caso de uso abre el `ShardScope`. */
export abstract class SessionRepository {
  abstract insert(session: Session): Promise<void>;

  /** La sesión aunque esté revocada o vencida, o `undefined` si no existe o es de otro usuario. */
  abstract find(
    userId: string,
    sessionId: string,
  ): Promise<Session | undefined>;

  /**
   * Como `find`, pero bloquea la fila hasta el fin de la transacción abierta: dos refresh simultáneos del
   * mismo token se atienden uno después del otro, y el segundo ve la generación que dejó el primero.
   */
  abstract findForUpdate(
    userId: string,
    sessionId: string,
  ): Promise<Session | undefined>;

  /** Sesiones sin revocar del usuario, la más reciente primero. */
  abstract listActive(userId: string): Promise<readonly Session[]>;

  /** @throws OptimisticLockError si otra escritura cambió la sesión. */
  abstract update(session: Session): Promise<void>;
}
