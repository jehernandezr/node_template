import type { TenantMoveStatus } from './tenant-move-status.enum.js';

/** A tenant move as identity records it in the catalog. */
export interface TenantMove {
  readonly moveId: string;
  readonly tenantId: string;
  readonly targetGroup: string;
  readonly targetRegion: string;
  readonly sagaId: string;
  readonly status: TenantMoveStatus;
  readonly startedAt: Date;
  /** When the last service switched to the target; from then the source's grace period runs. */
  readonly switchedAt?: Date;
  /** The last time cleaning the source was attempted. */
  readonly cleanupAttemptedAt?: Date;
}
