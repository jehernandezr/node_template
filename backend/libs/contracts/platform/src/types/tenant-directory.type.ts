/**
 * Where a tenant lives according to the service that placed it: its region and the shard groups it chose. Each service
 * translates each group to its own logical shard.
 */
export interface TenantDirectoryEntry {
  tenantId: string;
  region: string;
  /** Shard groups, in the directory order of whoever placed it. */
  groups: string[];
  /** `true` when the tenant is the exclusive owner of its shards. */
  dedicated: boolean;
}

/** The tenant whose row is removed from a service's directory. */
export interface TenantDirectoryRef {
  tenantId: string;
}

/** Acknowledgment of placing or removing a tenant in a service's directory. */
export interface TenantDirectoryAck {
  tenantId: string;
}
