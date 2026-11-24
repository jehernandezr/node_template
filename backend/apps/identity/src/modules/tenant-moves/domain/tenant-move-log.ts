import type { TenantMove } from './tenant-move.js';

/** Bitácora de traslados de tenant en el catálogo. */
export abstract class TenantMoveLog {
  /** Anota un traslado en curso. Devuelve `false` si el tenant ya tiene otro en curso. */
  abstract start(move: TenantMove): Promise<boolean>;

  /** El traslado en curso del tenant, si lo hay. */
  abstract runningFor(tenantId: string): Promise<TenantMove | undefined>;

  /** Pasa a `Switched` un traslado en curso; repetirlo conserva el primer instante. */
  abstract markSwitched(moveId: string, at: Date): Promise<void>;

  /** Pasa a `Aborted` un traslado en curso. */
  abstract markAborted(moveId: string): Promise<void>;

  /** Pasa a `CleanedUp` un traslado ya cambiado de directorio. */
  abstract markCleanedUp(moveId: string): Promise<void>;

  /** Anota cuándo se intentó limpiar el origen de un traslado, así la corrida siguiente le da turno a otros. */
  abstract markCleanupAttempted(moveId: string, at: Date): Promise<void>;

  /**
   * Traslados cambiados antes de `before` y todavía sin limpiar: primero los que nunca se intentaron y después los
   * que llevan más tiempo sin intentarse.
   */
  abstract switchedBefore(
    before: Date,
    limit: number,
  ): Promise<readonly TenantMove[]>;
}
