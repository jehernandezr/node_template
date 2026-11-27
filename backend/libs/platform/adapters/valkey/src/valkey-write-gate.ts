import { TenantWriteGate } from '@platform/sharding';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';
import { ValkeyUnavailableError } from './valkey-unavailable.error.js';

/**
 * Valkey write gate: closing it means creating `<prefix>:tenant-write-gate:<tenant>`. It does not touch the
 * directory, so it works when another process owns the placement. Each service closes its own, because
 * each one's ACL only reaches its prefix. The key does not expire: only the move that closed it opens it, when
 * switching directory or when cancelled. Each write transaction of the service checks the key with an
 * `EXISTS`; the guarantee that nothing reaches the source late comes from the shard barrier, not from this check.
 * When Valkey does not answer, the gate counts as closed: the write waits and then answers `TENANT_MIGRATING`
 * instead of reaching a shard a move may be leaving.
 */
export class ValkeyWriteGate extends TenantWriteGate {
  private static readonly KEY_TAG = 'tenant-write-gate';

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
  ) {
    super();
  }

  override async isClosed(tenantId: string): Promise<boolean> {
    try {
      const reply = await this.executor.run(ValkeyCommand.Exists, [
        this.keyOf(tenantId),
      ]);
      return Number(reply) > 0;
    } catch (error) {
      if (error instanceof ValkeyUnavailableError) {
        return true;
      }
      throw error;
    }
  }

  override async close(tenantId: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Set, [this.keyOf(tenantId), '1']);
  }

  override async open(tenantId: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Del, [this.keyOf(tenantId)]);
  }

  private keyOf(tenantId: string): string {
    return this.keyspace.key(ValkeyWriteGate.KEY_TAG, tenantId);
  }
}
