import type { TenantDirectoryEntry } from '@contracts/platform';

/** The other services' shard directories, which follow the placement identity chooses for each tenant. */
export abstract class FollowerDirectories {
  /**
   * Records the tenant in each service's directory; if a service already has it, it leaves it as is.
   * @throws FollowerDirectoryUnavailableError if a service does not confirm the placement.
   */
  abstract place(entry: TenantDirectoryEntry): Promise<void>;
}
