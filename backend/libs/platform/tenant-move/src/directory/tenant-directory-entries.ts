import type {
  TenantDirectoryAck,
  TenantDirectoryEntry,
  TenantDirectoryRef,
} from '@contracts/platform';
import {
  DirectoryWriteResult,
  ShardingError,
  ShardingErrorCode,
  TenantStatus,
  type DirectoryStore,
  type DirectoryWriter,
  type ShardRouter,
  type TenantPlacement,
} from '@platform/sharding';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantDataPresence } from './tenant-data-presence.js';
import type { TenantShardGroups } from './tenant-shard-groups.js';

/**
 * La fila de un tenant en el directorio de shards de un servicio que sigue la ubicación que eligió identity. `place`
 * la crea en los shards del servicio que corresponden a los grupos elegidos y, si ya existe, la deja como está: la
 * saga de alta la repite y un traslado posterior pudo cambiarla. `remove` es su reversa, antes de que el tenant tenga
 * datos: se niega a retirar un tenant que ya tiene datos en el servicio o que está en medio de un traslado.
 */
export class TenantDirectoryEntries {
  private static readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly writer: DirectoryWriter,
    private readonly directory: DirectoryStore,
    private readonly router: ShardRouter,
    private readonly groups: TenantShardGroups,
    private readonly presence: TenantDataPresence,
  ) {}

  /**
   * @throws TenantMoveError `UnknownTarget` si un grupo no lleva a un shard del directorio de este servicio.
   * @throws TenantMoveError `ShardTaken` si el grupo choca con un tenant dedicado, o el tenant es dedicado y el
   *   shard está ocupado.
   */
  async place(entry: TenantDirectoryEntry): Promise<TenantDirectoryAck> {
    const shardGroup = await this.shardsOf(entry);
    for (
      let attempt = 1;
      attempt <= TenantDirectoryEntries.MAX_ATTEMPTS;
      attempt++
    ) {
      if ((await this.writer.readPlacement(entry.tenantId)) !== undefined) {
        return { tenantId: entry.tenantId };
      }
      const result = await this.writer.putPlacement(
        {
          tenantId: entry.tenantId,
          region: entry.region,
          shardGroup,
          status: TenantStatus.Active,
          version: 1,
          dedicated: entry.dedicated,
        },
        undefined,
      );
      if (result === DirectoryWriteResult.Written) {
        await this.router.invalidate(entry.tenantId, { version: 1 });
        return { tenantId: entry.tenantId };
      }
      if (result === DirectoryWriteResult.ShardTaken) {
        throw new TenantMoveError(
          TenantMoveErrorCode.ShardTaken,
          'The shard group of the tenant is taken in this directory',
          { tenantId: entry.tenantId, shardGroup },
        );
      }
    }
    throw TenantDirectoryEntries.contended(entry.tenantId);
  }

  /**
   * @throws TenantMoveError `MoveInProgress` si el tenant tiene la compuerta cerrada por un traslado.
   * @throws TenantMoveError `TenantHasData` si el tenant ya tiene filas en las tablas del servicio.
   */
  async remove(ref: TenantDirectoryRef): Promise<TenantDirectoryAck> {
    for (
      let attempt = 1;
      attempt <= TenantDirectoryEntries.MAX_ATTEMPTS;
      attempt++
    ) {
      const current = await this.writer.readPlacement(ref.tenantId);
      if (current === undefined) {
        return { tenantId: ref.tenantId };
      }
      await this.assertRemovable(current);
      const result = await this.writer.deletePlacement(
        ref.tenantId,
        current.version,
      );
      if (result === DirectoryWriteResult.Written) {
        await this.router.invalidate(ref.tenantId);
        return { tenantId: ref.tenantId };
      }
    }
    throw TenantDirectoryEntries.contended(ref.tenantId);
  }

  /** @throws TenantMoveError `MoveInProgress` o `TenantHasData`. */
  private async assertRemovable(placement: TenantPlacement): Promise<void> {
    if (placement.status === TenantStatus.Migrating) {
      throw new TenantMoveError(
        TenantMoveErrorCode.MoveInProgress,
        'The tenant is being moved',
        { tenantId: placement.tenantId },
      );
    }
    if (await this.presence.holdsData(placement)) {
      throw new TenantMoveError(
        TenantMoveErrorCode.TenantHasData,
        'The tenant already has data in this service',
        { tenantId: placement.tenantId },
      );
    }
  }

  private async shardsOf(entry: TenantDirectoryEntry): Promise<string[]> {
    const shards = [
      ...new Set(
        entry.groups.map((group) => this.groups.shardOf(entry.region, group)),
      ),
    ];
    for (const shard of shards) {
      if ((await this.directory.getInstance(shard)) === undefined) {
        throw new TenantMoveError(
          TenantMoveErrorCode.UnknownTarget,
          'The shard group has no shard in this directory',
          { tenantId: entry.tenantId, shard },
        );
      }
    }
    return shards;
  }

  private static contended(tenantId: string): ShardingError {
    return new ShardingError(
      ShardingErrorCode.InvalidConfiguration,
      'Other writes kept changing the tenant placement',
      { details: { tenantId } },
    );
  }
}
