import type {
  TenantMoveAck,
  TenantMoveProgress,
  TenantMoveRef,
  TenantMoveVerification,
} from '@contracts/platform';
import type { ShardLister, ShardLocation } from '@platform/persistence';
import {
  TenantStatus,
  type PlacementTransition,
  type TenantWriteGate,
} from '@platform/sharding';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantDataTransfer } from '../transfer/tenant-data-transfer.js';
import type { TenantTransfer } from '../transfer/tenant-transfer.js';
import type { TenantMoveActivity } from './tenant-move-activity.js';
import type { TenantMoveFence } from './tenant-move-fence.js';
import type { TenantMoveListener } from './tenant-move-listener.js';
import type { TenantMoveShards } from './tenant-move-shards.js';

/**
 * The steps of a move in a service, in the order the `MoveTenant` saga calls them:
 * - `sync` copies while writes continue, until it catches up with the source;
 * - `finalize` closes the gate, raises the source shard fence (which waits for writes that already
 *   got in), copies the last round and verifies;
 * - `switch`, after the pivot, readies the copy (region and fences), points the directory to the target and opens the
 *   gate;
 * - `abort` discards the copy and opens the gate, and `cleanup`, after the grace period, deletes the source and lowers its fence.
 *
 * The source fence stays raised until `cleanup`: a process with the old placement cached cannot write
 * there in the meantime. A tenant with half-finished sagas on the source is not frozen: `sync` waits for them to finish and, if one
 * appears right before the fence, `finalize` fails and the move saga compensates.
 */
export class TenantMoves {
  constructor(
    private readonly shards: TenantMoveShards,
    private readonly transfer: TenantDataTransfer,
    private readonly gate: TenantWriteGate,
    private readonly fence: TenantMoveFence,
    private readonly transition: PlacementTransition,
    private readonly lister: ShardLister,
    private readonly activity: TenantMoveActivity,
    private readonly listener?: TenantMoveListener,
  ) {}

  /** @throws TenantMoveError `RoundPending` while the copy has not caught up with the source or the tenant has unfinished sagas. */
  async sync(move: TenantMoveRef): Promise<TenantMoveProgress> {
    const transfer = await this.transferOf(move);
    await this.assertNoOpenWork(
      transfer,
      TenantMoveErrorCode.RoundPending,
      'The tenant has work in progress in the source',
    );
    const progress = await this.transfer.sync(transfer);
    if (!progress.caughtUp) {
      throw new TenantMoveError(
        TenantMoveErrorCode.RoundPending,
        'The copy has not caught up with the source yet',
        { tables: progress.tables.length },
      );
    }
    return progress;
  }

  /**
   * @throws TenantMoveError `TenantBusy` if, with the fence raised, the tenant has half-finished sagas on the source.
   * @throws TenantMoveError `VerificationFailed` if the target did not end up equal to the source.
   */
  async finalize(move: TenantMoveRef): Promise<TenantMoveVerification> {
    const transfer = await this.transferOf(move);
    await this.gate.close(move.tenantId);
    await this.fence.raise(transfer.source, move.tenantId, move.moveId);
    await this.assertNoOpenWork(
      transfer,
      TenantMoveErrorCode.TenantBusy,
      'The tenant has work in progress behind the fence',
    );
    const verification = await this.transfer.verify(transfer);
    if (!verification.verified) {
      throw new TenantMoveError(
        TenantMoveErrorCode.VerificationFailed,
        'The target does not match the frozen source',
        {
          tables: verification.tables
            .filter((check) => check.sourceChecksum !== check.targetChecksum)
            .map((check) => check.table),
        },
      );
    }
    return verification;
  }

  /**
   * Lowers the fence and opens the gate before discarding the copy: the tenant writes to the source again while
   * the target, which no one reads, is purged.
   */
  async abort(move: TenantMoveRef): Promise<TenantMoveAck> {
    const transfer = await this.transferOf(move);
    await this.fence.lower(transfer.source, move.tenantId, move.moveId);
    await this.gate.open(move.tenantId);
    await this.transfer.abort(transfer);
    await this.listener?.aborted(move);
    return { moveId: move.moveId };
  }

  /**
   * Before opening writes on the target: records the target region in the copy, lowers the fence a
   * previous move may have left on the target (the tenant returns to a shard it left) and marks the source
   * fence as pivoted. Everything is idempotent because the saga repeats the step until it completes.
   */
  async switch(move: TenantMoveRef): Promise<TenantMoveAck> {
    const target = this.shards.targetOf(move);
    const targetSource = await this.shards.target(move);
    await this.transfer.assignRegion(
      move.tenantId,
      targetSource,
      target.region,
    );
    await this.fence.lowerAny(targetSource, move.tenantId);
    for (const shard of await this.fencedSources(move)) {
      await this.fence.markSwitched(shard, move.tenantId, move.moveId);
    }
    await this.transition.apply(move.tenantId, (current) => {
      const there =
        current.region === target.region &&
        current.shardGroup.length === 1 &&
        current.shardGroup[0] === target.shard;
      if (there && current.status === TenantStatus.Active) {
        return undefined;
      }
      return {
        region: target.region,
        shardGroup: [target.shard],
        status: TenantStatus.Active,
      };
    });
    await this.gate.open(move.tenantId);
    await this.listener?.switched(move);
    return { moveId: move.moveId };
  }

  /**
   * Deletes the tenant data on each shard where this move left its fence, and then lowers the fence. First
   * it checks in the service directory that the tenant no longer lives on any of those shards: if this
   * service's `switch` did not run, the fence is the only thing stopping its writes and the source data is still live.
   * It also does not clean up while another move of the tenant has its fence raised without pivoting: that move may return
   * to one of these shards, which between its `finalize` and its `switch` already holds the good copy.
   * @throws TenantMoveError `NotSwitched` if the service directory still routes the tenant to one of those shards.
   * @throws TenantMoveError `MoveInProgress` if another move of the tenant is between `finalize` and `switch`.
   */
  async cleanup(move: TenantMoveRef): Promise<TenantMoveAck> {
    const fenced = await this.fencedSources(move);
    if (fenced.length === 0) {
      return { moveId: move.moveId };
    }
    const placement = await this.shards.placementOf(move.tenantId);
    const live = fenced
      .map(({ logicalShard }) => logicalShard)
      .filter((shard) => placement?.shardGroup.includes(shard) === true);
    if (live.length > 0) {
      throw new TenantMoveError(
        TenantMoveErrorCode.NotSwitched,
        'The service still routes the tenant to the shard to clean',
        { tenantId: move.tenantId, shards: live },
      );
    }
    await this.assertNoMoveInFlight(move);
    for (const shard of fenced) {
      await this.transfer.cleanup(move.tenantId, shard);
      await this.fence.lower(shard, move.tenantId, move.moveId);
    }
    return { moveId: move.moveId };
  }

  /** @throws TenantMoveError `MoveInProgress` if on any shard another move of the tenant has its fence unpivoted. */
  private async assertNoMoveInFlight(move: TenantMoveRef): Promise<void> {
    for (const location of await this.lister.list()) {
      const inFlight = await this.fence.unswitchedBy(location, move.tenantId);
      if (inFlight !== undefined && inFlight !== move.moveId) {
        throw new TenantMoveError(
          TenantMoveErrorCode.MoveInProgress,
          'Another move of the tenant has not switched yet',
          { tenantId: move.tenantId, inFlight },
        );
      }
    }
  }

  /** The shards, except the target, where the tenant fence is this move's fence. */
  private async fencedSources(move: TenantMoveRef): Promise<ShardLocation[]> {
    const target = this.shards.targetOf(move);
    const fenced: ShardLocation[] = [];
    for (const location of await this.lister.list()) {
      if (location.logicalShard === target.shard) {
        continue;
      }
      if (
        (await this.fence.raisedBy(location, move.tenantId)) === move.moveId
      ) {
        fenced.push(location);
      }
    }
    return fenced;
  }

  /** @throws TenantMoveError with `code` if the tenant has open work on the source. */
  private async assertNoOpenWork(
    transfer: TenantTransfer,
    code: TenantMoveErrorCode,
    message: string,
  ): Promise<void> {
    const openWork = await this.activity.openWork(
      transfer.source,
      transfer.tenantId,
    );
    if (openWork > 0) {
      throw new TenantMoveError(code, message, { openWork });
    }
  }

  private async transferOf(move: TenantMoveRef): Promise<TenantTransfer> {
    return {
      moveId: move.moveId,
      tenantId: move.tenantId,
      source: await this.shards.source(move),
      target: await this.shards.target(move),
    };
  }
}
