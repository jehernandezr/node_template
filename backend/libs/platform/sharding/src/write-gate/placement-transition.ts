import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { DirectoryWriteResult } from '../model/directory-write-result.enum.js';
import type { TenantPlacement } from '../model/tenant-placement.js';
import type { DirectoryWriter } from '../ports/directory-writer.js';
import type { ShardRouter } from '../shard-router.js';

/** Lo que cambia de un placement; `undefined` cuando ya está como se pide. */
export type PlacementChange = (
  current: TenantPlacement,
) =>
  | Partial<Pick<TenantPlacement, 'region' | 'shardGroup' | 'status'>>
  | undefined;

/**
 * Cambia el placement de un tenant con la escritura condicional del directorio: lee del primario, escribe la
 * versión siguiente y, si otra escritura ganó entre medio, vuelve a leer. Al escribir invalida el router, que
 * publica el cambio a los demás procesos.
 */
export class PlacementTransition {
  private static readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly writer: DirectoryWriter,
    private readonly router: ShardRouter,
  ) {}

  /**
   * @returns el placement vigente al terminar.
   * @throws ShardingError `UnknownTenant` si el directorio no tiene el tenant; `InvalidConfiguration` si
   *   otras escrituras ganan todos los intentos o el grupo nuevo choca con un shard dedicado.
   */
  async apply(
    tenantId: string,
    change: PlacementChange,
  ): Promise<TenantPlacement> {
    for (
      let attempt = 1;
      attempt <= PlacementTransition.MAX_ATTEMPTS;
      attempt++
    ) {
      const current = await this.writer.readPlacement(tenantId);
      if (current === undefined) {
        throw new ShardingError(
          ShardingErrorCode.UnknownTenant,
          'No placement for tenant',
          { details: { tenantId } },
        );
      }
      const patch = change(current);
      if (patch === undefined) {
        return current;
      }
      const next: TenantPlacement = {
        ...current,
        ...patch,
        version: current.version + 1,
      };
      const result = await this.writer.putPlacement(next, current.version);
      if (result === DirectoryWriteResult.Written) {
        await this.router.invalidate(tenantId, { version: next.version });
        return next;
      }
      if (result === DirectoryWriteResult.ShardTaken) {
        throw PlacementTransition.rejected(tenantId, result);
      }
    }
    throw PlacementTransition.rejected(
      tenantId,
      DirectoryWriteResult.VersionConflict,
    );
  }

  private static rejected(
    tenantId: string,
    result: DirectoryWriteResult,
  ): ShardingError {
    return new ShardingError(
      ShardingErrorCode.InvalidConfiguration,
      'The placement change was rejected by the directory',
      { details: { tenantId, result } },
    );
  }
}
