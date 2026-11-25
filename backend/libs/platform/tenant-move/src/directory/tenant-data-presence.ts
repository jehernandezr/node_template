import type { TenantPlacement } from '@platform/sharding';

/** Si un tenant ya tiene datos del servicio en alguno de los shards de su placement. */
export abstract class TenantDataPresence {
  abstract holdsData(placement: TenantPlacement): Promise<boolean>;
}
