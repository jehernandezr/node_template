import { TenantMoveLog } from '../../domain/tenant-move-log.js';
import type { TenantMove } from '../../domain/tenant-move.js';
import { TenantMoveStatus } from '../../domain/tenant-move-status.enum.js';

/** Bitácora de traslados en memoria, con la misma regla que el índice único: un traslado en curso por tenant. */
export class InMemoryTenantMoveLog extends TenantMoveLog {
  private readonly moves = new Map<string, TenantMove>();

  async start(move: TenantMove): Promise<boolean> {
    if ((await this.runningFor(move.tenantId)) !== undefined) {
      return false;
    }
    this.moves.set(move.moveId, move);
    return true;
  }

  async runningFor(tenantId: string): Promise<TenantMove | undefined> {
    return [...this.moves.values()].find(
      (move) =>
        move.tenantId === tenantId && move.status === TenantMoveStatus.Running,
    );
  }

  async markSwitched(moveId: string, at: Date): Promise<void> {
    this.advance(moveId, TenantMoveStatus.Running, {
      status: TenantMoveStatus.Switched,
      switchedAt: at,
    });
  }

  async markAborted(moveId: string): Promise<void> {
    this.advance(moveId, TenantMoveStatus.Running, {
      status: TenantMoveStatus.Aborted,
    });
  }

  async markCleanedUp(moveId: string): Promise<void> {
    this.advance(moveId, TenantMoveStatus.Switched, {
      status: TenantMoveStatus.CleanedUp,
    });
  }

  async markCleanupAttempted(moveId: string, at: Date): Promise<void> {
    this.advance(moveId, TenantMoveStatus.Switched, {
      cleanupAttemptedAt: at,
    });
  }

  async switchedBefore(
    before: Date,
    limit: number,
  ): Promise<readonly TenantMove[]> {
    return [...this.moves.values()]
      .filter(
        (move) =>
          move.status === TenantMoveStatus.Switched &&
          move.switchedAt !== undefined &&
          move.switchedAt < before,
      )
      .sort(
        (a, b) =>
          InMemoryTenantMoveLog.attemptOrder(a) -
            InMemoryTenantMoveLog.attemptOrder(b) ||
          (a.switchedAt?.getTime() ?? 0) - (b.switchedAt?.getTime() ?? 0),
      )
      .slice(0, limit);
  }

  find(moveId: string): TenantMove | undefined {
    return this.moves.get(moveId);
  }

  /** Sin intento va primero, como `NULLS FIRST`. */
  private static attemptOrder(move: TenantMove): number {
    return move.cleanupAttemptedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  }

  private advance(
    moveId: string,
    from: TenantMoveStatus,
    change: Partial<TenantMove>,
  ): void {
    const move = this.moves.get(moveId);
    if (move?.status === from) {
      this.moves.set(moveId, { ...move, ...change });
    }
  }
}
