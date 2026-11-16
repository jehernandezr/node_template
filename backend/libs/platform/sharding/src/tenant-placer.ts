import { ShardingGuard } from './errors/sharding-guard.js';
import { DirectoryWriteResult } from './model/directory-write-result.enum.js';
import type { TenantPlacement } from './model/tenant-placement.js';
import type {
  AvailableShard,
  PlacementRequest,
  ShardPlacementPolicy,
} from './placement-policy.js';
import type { DirectoryWriter } from './ports/directory-writer.js';

/** Resultado de {@link TenantPlacer.place}. */
export type TenantPlacementResult =
  | { readonly placed: true; readonly placement: TenantPlacement }
  | { readonly placed: false; readonly conflict: DirectoryWriteResult };

/**
 * Ubica tenants nuevos: lee la región, pregunta a la política y escribe la
 * respuesta con `DirectoryWriter.putPlacement`. Cuando gana un escritor
 * concurrente (`VersionConflict` o `ShardTaken`) vuelve a leer y a preguntar a
 * la política, hasta `maxAttempts`. Un tenant que ya tiene placement lo recibe
 * de vuelta, así la saga de alta puede reintentar este paso sin riesgo.
 */
export class TenantPlacer {
  static readonly DEFAULT_MAX_ATTEMPTS = 3;

  /**
   * @param maxAttempts Intentos antes de rendirse cuando los escritores concurrentes siguen ganando.
   * @throws ShardingError `InvalidConfiguration` cuando `maxAttempts` no es un entero positivo.
   */
  constructor(
    private readonly policy: ShardPlacementPolicy,
    private readonly directory: DirectoryWriter,
    private readonly maxAttempts = TenantPlacer.DEFAULT_MAX_ATTEMPTS,
  ) {
    ShardingGuard.instance.positiveInteger('maxAttempts', maxAttempts);
  }

  /**
   * @throws ShardingError de la política, por ejemplo `UnknownShard` cuando la región no tiene un shard adecuado.
   */
  async place(
    request: PlacementRequest,
    availableShards: readonly AvailableShard[],
  ): Promise<TenantPlacementResult> {
    let conflict = DirectoryWriteResult.VersionConflict;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const current = await this.directory.listPlacements(request.region);
      const existing = current.find(
        (placement) => placement.tenantId === request.tenantId,
      );
      if (existing !== undefined) {
        return { placed: true, placement: existing };
      }
      const placement = this.policy.place(request, current, availableShards);
      const result = await this.directory.putPlacement(placement, undefined);
      if (result === DirectoryWriteResult.Written) {
        return { placed: true, placement };
      }
      conflict = result;
    }
    return { placed: false, conflict };
  }
}
