import type { Clock } from '@platform/kernel';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import type { TenantPlacement } from '../model/tenant-placement.js';
import type { DirectoryStore } from '../ports/directory-store.js';
import { InvalidationLog } from './invalidation-log.js';
import type { PlacementCache } from './placement-cache.js';
import { SharedRecordKind } from './shared-record-kind.enum.js';

interface InFlightLoad {
  /** Secuencia de invalidación cuando empezó la carga. */
  readonly startedAt: number;
  readonly promise: Promise<TenantPlacement>;
}

/**
 * Carga el placement de un tenant (caché compartido y, si falla, directorio) con
 * vuelo único: las cargas simultáneas del mismo tenant comparten una sola lectura,
 * salvo que una invalidación ocurriera después de que empezó.
 */
export class PlacementLoader {
  private readonly inflight = new Map<string, InFlightLoad>();

  /**
   * @param maxInFlight Máximo de cargas en vuelo registradas; pasado el límite una carga corre sin vuelo único.
   */
  constructor(
    private readonly directory: DirectoryStore,
    private readonly cache: PlacementCache,
    private readonly invalidations: InvalidationLog,
    private readonly clock: Clock,
    private readonly maxInFlight: number,
  ) {}

  /**
   * @throws ShardingError `UnknownTenant` si el directorio no tiene el tenant.
   */
  loadOrJoin(tenantId: string): Promise<TenantPlacement> {
    const pending = this.inflight.get(tenantId);
    if (
      pending !== undefined &&
      this.invalidations.isCurrent(tenantId, pending.startedAt)
    ) {
      return pending.promise;
    }
    const startedAt = this.invalidations.current();
    const promise: Promise<TenantPlacement> = this.loadPlacement(
      tenantId,
      startedAt,
    ).finally(() => {
      if (this.inflight.get(tenantId)?.promise === promise) {
        this.inflight.delete(tenantId);
      }
    });
    if (this.inflight.has(tenantId) || this.inflight.size < this.maxInFlight) {
      this.inflight.set(tenantId, { startedAt, promise });
    }
    return promise;
  }

  private async loadPlacement(
    tenantId: string,
    sequence: number,
  ): Promise<TenantPlacement> {
    const startedAtMs = this.now();
    const record = await this.cache.readShared(tenantId);
    const shared =
      record?.kind === SharedRecordKind.Placement ? record.entry : undefined;
    if (
      shared !== undefined &&
      this.now() < shared.expiresAt &&
      !this.cache.isOutdated(tenantId, shared.placement.version)
    ) {
      if (this.invalidations.isCurrent(tenantId, sequence)) {
        this.cache.remember(tenantId, shared.placement, shared.expiresAt);
      }
      return shared.placement;
    }

    const placement = await this.directory.getPlacement(tenantId);
    if (placement === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownTenant,
        'No placement for tenant',
        { details: { tenantId } },
      );
    }
    if (
      !this.invalidations.isCurrent(tenantId, sequence) ||
      this.cache.isOutdated(tenantId, placement.version)
    ) {
      // Invalidado mientras se leía el directorio, o una réplica atrasada respecto
      // a una versión que este proceso ya vio: se responde al llamador sin cachear.
      return placement;
    }
    const sharedExpiresAt = this.cache.sharedExpiry();
    this.cache.remember(tenantId, placement, sharedExpiresAt);
    await this.cache.writeShared(placement, sharedExpiresAt, startedAtMs);
    return placement;
  }

  private now(): number {
    return this.clock.now().getTime();
  }
}
