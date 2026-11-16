import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';
import { WrongRegionError } from './errors/wrong-region.error.js';
import { ShardAccess } from './model/shard-access.enum.js';
import { ShardKey } from './model/shard-key.enum.js';
import type { ResolvedShard } from './model/resolved-shard.js';
import type { ShardDirectoryChanged } from './model/shard-directory-changed.js';
import type { TenantPlacement } from './model/tenant-placement.js';
import type { ShardDirectoryChangeSubscriber } from './ports/shard-directory-change-subscriber.js';
import type { InvalidateOptions } from './router/invalidate-options.js';
import { LookupBudget } from './router/lookup-budget.js';
import type { ResolveRequest } from './router/resolve-request.js';
import { ShardRouterAssembler } from './router/shard-router-assembler.js';
import type { ShardRouterOptions } from './router/shard-router-options.js';
import type { ShardRouterParts } from './router/shard-router-parts.js';
import { TenantWriteGate } from './router/tenant-write-gate.js';

/**
 * Enruta una petición a su instancia física: tenant, región, grupo de shards,
 * shard lógico e instancia.
 *
 * Los ids de tenant y las claves de enrutamiento se pasan a minúsculas antes de
 * usarse; el directorio debe guardar ids en minúsculas. Una clave más larga que
 * `maxKeyLength` se rechaza.
 *
 * Un placement se busca en el mapa en proceso, luego en el caché compartido y
 * al final en el directorio. Las fallas simultáneas del mismo tenant comparten
 * una sola carga. Una invalidación posterior al inicio de una carga hace que su
 * resultado llegue a quien lo pidió sin cachearse. Entre procesos, `invalidate`
 * deja una lápida versionada en el caché compartido y publica el cambio.
 *
 * Agregar un shard a un grupo solo es válido con una saga de traslado y el
 * tenant en `Migrating`: la versión nueva del placement estrena anillo y las
 * escrituras siguen bloqueadas hasta que el traslado termina.
 */
export class ShardRouter {
  private readonly parts: ShardRouterParts;

  /** @throws ShardingError `InvalidConfiguration` cuando un TTL, un límite o el patrón es inválido. */
  constructor(options: ShardRouterOptions) {
    this.parts = ShardRouterAssembler.assemble(options);
  }

  /**
   * Resuelve la instancia física de una petición.
   * @throws ShardingError `KeyMissing`, `InvalidTenantId`, `InvalidKey`, `UnknownTenant`,
   *   `UnknownShard`, `TenantMigrating` o `TenantNotWritable`.
   * @throws WrongRegionError cuando el tenant vive en otra región.
   * @throws DeadlineExceededError (`@platform/primitives`) si `request.deadline` vence primero.
   * @throws El `reason` de `request.signal` si aborta primero.
   */
  async resolve(request: ResolveRequest): Promise<ResolvedShard> {
    const { clock, normalizer, cache, loader, instances } = this.parts;
    const budget = new LookupBudget(clock, request.deadline, request.signal);
    budget.check();
    const tenantId = normalizer.tenantId(request.tenantId);
    const routingKey =
      request.keyKind === ShardKey.Tenant
        ? tenantId
        : normalizer.routingKey(request.keyKind, request.keyValue);

    const placement =
      cache.local(tenantId) ?? (await budget.wait(loader.loadOrJoin(tenantId)));
    if (
      this.parts.currentRegion !== undefined &&
      placement.region !== this.parts.currentRegion
    ) {
      throw new WrongRegionError(placement.region);
    }
    if (request.access === ShardAccess.Write) {
      TenantWriteGate.assertWritable(tenantId, placement.status);
    }
    const logicalShard = this.selectLogicalShard(placement, routingKey);
    const instance =
      instances.cached(logicalShard) ??
      (await budget.wait(instances.load(logicalShard)));
    return {
      tenantId,
      region: placement.region,
      logicalShard,
      instance,
      status: placement.status,
    };
  }

  /** Lanza los mismos errores que un `resolve` de escritura, para un resultado que ya se tiene. */
  assertWritable(resolved: ResolvedShard): void {
    TenantWriteGate.assertWritable(resolved.tenantId, resolved.status);
  }

  /**
   * Descarta el placement de un tenant y las instancias de su grupo de shards, deja una lápida
   * versionada en el caché compartido y publica el cambio a los demás procesos. Se llama
   * después de que la escritura al directorio se confirma.
   * @throws ShardingError `KeyMissing` o `InvalidTenantId` por un id malo, `InvalidConfiguration`
   *   cuando `options.version` no es un entero no negativo.
   */
  invalidate(tenantId: string, options: InvalidateOptions = {}): Promise<void> {
    return this.parts.invalidator.invalidate(tenantId, options);
  }

  /**
   * Aplica un cambio publicado por otro proceso. Solo cambia estado en proceso. Nunca lanza
   * por un evento malo: lo informa a `onCacheError` y lo ignora.
   */
  applyDirectoryChange(event: ShardDirectoryChanged): void {
    this.parts.applier.apply(event);
  }

  /**
   * Suscribe este router a los cambios del directorio de todos los procesos.
   * @returns una función que deja de escuchar.
   */
  listen(
    subscriber: ShardDirectoryChangeSubscriber,
  ): Promise<() => Promise<void>> {
    return subscriber.subscribe((event) => this.applyDirectoryChange(event));
  }

  /** Borra la instancia cacheada de un shard lógico, sin importar qué placements lo referencian. */
  invalidateShard(logicalShard: string): void {
    this.parts.instances.invalidate(logicalShard);
  }

  private selectLogicalShard(
    placement: TenantPlacement,
    routingKey: string,
  ): string {
    const [first] = placement.shardGroup;
    if (first === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'Tenant has no shards assigned',
        { details: { tenantId: placement.tenantId } },
      );
    }
    if (placement.shardGroup.length === 1) {
      return first;
    }
    return this.parts.strategy.locate(
      routingKey,
      placement.shardGroup,
      placement.version,
    );
  }
}
