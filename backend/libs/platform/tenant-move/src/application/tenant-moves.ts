import type {
  TenantMoveAck,
  TenantMoveProgress,
  TenantMoveRef,
  TenantMoveVerification,
} from '@contracts/platform';
import {
  PostgresFailureClassifier,
  PostgresSqlState,
  type ShardDataSources,
  type ShardLister,
  type TenantWriteFence,
} from '@platform/persistence';
import {
  TenantStatus,
  type PlacementTransition,
  type TenantWriteGate,
} from '@platform/sharding';
import type { DataSource } from 'typeorm';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantDataTransfer } from '../transfer/tenant-data-transfer.js';
import type { TenantTransfer } from '../transfer/tenant-transfer.js';
import type { TenantMoveActivity } from './tenant-move-activity.js';
import type { TenantMoveListener } from './tenant-move-listener.js';
import type { TenantMoveShards } from './tenant-move-shards.js';

/** Un shard donde la barrera del tenant es la del traslado. */
interface FencedShard {
  readonly logicalShard: string;
  readonly dataSource: DataSource;
}

/**
 * Los pasos de un traslado en un servicio, en el orden en que los llama la saga `MoveTenant`:
 * - `sync` copia mientras las escrituras siguen, hasta alcanzar al origen;
 * - `finalize` cierra la compuerta, levanta la barrera del shard de origen (que espera a las escrituras que ya
 *   entraron), copia la última ronda y verifica;
 * - `switch`, después del pivote, deja lista la copia (región y barreras), apunta el directorio al destino y abre la
 *   compuerta;
 * - `abort` descarta la copia y abre la compuerta, y `cleanup`, pasada la gracia, borra el origen y baja su barrera.
 *
 * La barrera del origen queda levantada hasta `cleanup`: un proceso con el placement viejo en caché no puede escribir
 * ahí mientras tanto. Un tenant con sagas a medias en el origen no se congela: `sync` espera a que terminen y, si una
 * aparece justo antes de la barrera, `finalize` falla y la saga del traslado se compensa.
 */
export class TenantMoves {
  constructor(
    private readonly shards: TenantMoveShards,
    private readonly transfer: TenantDataTransfer,
    private readonly gate: TenantWriteGate,
    private readonly fence: TenantWriteFence,
    private readonly transition: PlacementTransition,
    private readonly lister: ShardLister,
    private readonly dataSources: ShardDataSources,
    private readonly activity: TenantMoveActivity,
    private readonly listener?: TenantMoveListener,
  ) {}

  /** @throws TenantMoveError `RoundPending` mientras la copia no alcanza al origen o el tenant tiene sagas a medias. */
  async sync(move: TenantMoveRef): Promise<TenantMoveProgress> {
    const transfer = await this.transferOf(move);
    await this.assertNoOpenWork(
      transfer,
      TenantMoveErrorCode.RoundPending,
      'The tenant has work in progress in the source',
    );
    const progress = await this.round(() => this.transfer.sync(transfer));
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
   * @throws TenantMoveError `TenantBusy` si con la barrera levantada el tenant tiene sagas a medias en el origen.
   * @throws TenantMoveError `VerificationFailed` si el destino no quedó igual al origen.
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
    const verification = await this.round(() => this.transfer.verify(transfer));
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
   * Baja la barrera y abre la compuerta antes de descartar la copia: el tenant vuelve a escribir en el origen mientras
   * se purga el destino, que nadie lee.
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
   * Antes de abrir las escrituras en el destino: anota la región de destino en la copia, baja la barrera que un
   * traslado anterior pudo dejar en el destino (el tenant vuelve a un shard del que salió) y marca como pivotada la
   * barrera del origen. Todo es idempotente porque la saga repite el paso hasta completarlo.
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
    for (const { dataSource } of await this.fencedSources(move)) {
      await this.fence.markSwitched(dataSource, move.tenantId, move.moveId);
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
   * Borra los datos del tenant en cada shard donde este traslado dejó su barrera, y después baja la barrera. Antes
   * comprueba en el directorio del servicio que el tenant ya no vive en ninguno de esos shards: si el `switch` de
   * este servicio no corrió, la barrera es lo único que frena sus escrituras y los datos del origen siguen vivos.
   * Tampoco limpia mientras otro traslado del tenant tiene su barrera levantada sin pivotar: ese traslado puede volver
   * a uno de estos shards, que entre su `finalize` y su `switch` ya guarda la copia buena.
   * @throws TenantMoveError `NotSwitched` si el directorio del servicio todavía lleva al tenant a uno de esos shards.
   * @throws TenantMoveError `MoveInProgress` si otro traslado del tenant está entre `finalize` y `switch`.
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
    for (const { dataSource } of fenced) {
      await this.transfer.cleanup(move.tenantId, dataSource);
      await this.fence.lower(dataSource, move.tenantId, move.moveId);
    }
    return { moveId: move.moveId };
  }

  /** @throws TenantMoveError `MoveInProgress` si en algún shard otro traslado del tenant tiene la barrera sin pivotar. */
  private async assertNoMoveInFlight(move: TenantMoveRef): Promise<void> {
    for (const location of await this.lister.list()) {
      const dataSource = await this.dataSources.get(location);
      const inFlight = await this.fence.unswitchedBy(dataSource, move.tenantId);
      if (inFlight !== undefined && inFlight !== move.moveId) {
        throw new TenantMoveError(
          TenantMoveErrorCode.MoveInProgress,
          'Another move of the tenant has not switched yet',
          { tenantId: move.tenantId, inFlight },
        );
      }
    }
  }

  /** Los shards, salvo el destino, donde la barrera del tenant es la de este traslado. */
  private async fencedSources(move: TenantMoveRef): Promise<FencedShard[]> {
    const target = this.shards.targetOf(move);
    const fenced: FencedShard[] = [];
    for (const location of await this.lister.list()) {
      if (location.logicalShard === target.shard) {
        continue;
      }
      const dataSource = await this.dataSources.get(location);
      if (
        (await this.fence.raisedBy(dataSource, move.tenantId)) === move.moveId
      ) {
        fenced.push({ logicalShard: location.logicalShard, dataSource });
      }
    }
    return fenced;
  }

  /**
   * Corre una ronda de copia. Una llave foránea que falla en el destino es una fila hija escrita en el origen después de
   * que la ronda copió su tabla padre: la ronda siguiente trae al padre, así que se responde `RoundPending`.
   * @throws TenantMoveError `RoundPending` ante una violación de llave foránea.
   */
  private async round<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (
        PostgresFailureClassifier.hasSqlState(
          error,
          PostgresSqlState.ForeignKeyViolation,
        )
      ) {
        throw new TenantMoveError(
          TenantMoveErrorCode.RoundPending,
          'A row reached the target before its parent',
        );
      }
      throw error;
    }
  }

  /** @throws TenantMoveError con `code` si el tenant tiene trabajo abierto en el origen. */
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
