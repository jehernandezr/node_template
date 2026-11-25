import { ShardAccess, ShardKey, type ShardRouter } from '@platform/sharding';
import type { UserRef } from '../../shared/types/user-ref.type.js';
import type { IdentityTestServers } from './identity-test-servers.js';

/**
 * Inspects the databases from outside the app: on which shard the router places a user or a tenant and on which
 * shard a row actually ended up. The logical shard names are those of their databases.
 */
export class ShardProbe {
  constructor(
    private readonly servers: IdentityTestServers,
    private readonly router: ShardRouter,
  ) {}

  async shardOfUser(ref: UserRef): Promise<string> {
    const resolved = await this.router.resolve({
      tenantId: ref.homeTenantId,
      keyKind: ShardKey.User,
      keyValue: ref.userId,
      access: ShardAccess.Read,
    });
    return resolved.logicalShard;
  }

  async shardOfTenant(tenantId: string): Promise<string> {
    const resolved = await this.router.resolve({
      tenantId,
      keyKind: ShardKey.Tenant,
      access: ShardAccess.Read,
    });
    return resolved.logicalShard;
  }

  /** The shards where `sql` returns any row. */
  async shardsWith(sql: string): Promise<string[]> {
    const found: string[] = [];
    for (const shard of this.servers.shards()) {
      if ((await shard.rows(sql)).length > 0) {
        found.push(shard.database);
      }
    }
    return found;
  }

  async rowsIn<T>(shard: string, sql: string): Promise<readonly T[]> {
    const probe = this.servers.shards().find((s) => s.database === shard);
    if (probe === undefined) {
      throw new Error(`Unknown shard ${shard}`);
    }
    return probe.rows<T>(sql);
  }

  async catalogRows<T>(sql: string): Promise<readonly T[]> {
    return this.servers.catalog().rows<T>(sql);
  }

  /** The service role connection, subject to RLS, to open one to a shard. */
  serviceConnection(): ReturnType<IdentityTestServers['serviceConnection']> {
    return this.servers.serviceConnection();
  }

  names(): readonly string[] {
    return this.servers.shards().map((shard) => shard.database);
  }
}
