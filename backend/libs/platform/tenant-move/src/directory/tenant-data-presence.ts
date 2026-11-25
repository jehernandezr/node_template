import type { TenantPlacement } from '@platform/sharding';

/** Si un tenant ya tiene datos del servicio en alguno de los shards de su placement. */
export abstract class TenantDataPresence {
  /**
   * Indica si el tenant tiene filas del servicio en algún shard de su placement.
   * @param placement Ubicación actual del tenant en el directorio.
   * @returns `true` si hay al menos una fila: retirarlo del directorio las dejaría huérfanas.
   */
  abstract holdsData(placement: TenantPlacement): Promise<boolean>;
}
