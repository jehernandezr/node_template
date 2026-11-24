import type { TenantMoveStatus } from './tenant-move-status.enum.js';

/** Un traslado de tenant tal como lo anota identity en el catálogo. */
export interface TenantMove {
  readonly moveId: string;
  readonly tenantId: string;
  readonly targetGroup: string;
  readonly targetRegion: string;
  readonly sagaId: string;
  readonly status: TenantMoveStatus;
  readonly startedAt: Date;
  /** Cuándo el último servicio pasó al destino; desde ahí corre la gracia del origen. */
  readonly switchedAt?: Date;
  /** La última vez que se intentó limpiar el origen. */
  readonly cleanupAttemptedAt?: Date;
}
