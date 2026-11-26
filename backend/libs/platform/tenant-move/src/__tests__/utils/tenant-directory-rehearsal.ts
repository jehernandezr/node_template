import type { TenantDirectoryOperations } from '@contracts/platform';
import {
  UuidV7IdGenerator,
  SystemClock,
  SystemRandomSource,
} from '@platform/kernel';
import type { CallOutcome } from '@platform/primitives';
import {
  ProvisionedService,
  type InternalOperationsClient,
  type ServiceTestServers,
} from '@platform/service/test-utils';

/** A tenant row in the catalog shard directory. */
export interface DirectoryRow {
  readonly region: string;
  readonly shard_group: readonly string[];
  readonly status: string;
}

/** What a rehearsal leaves: two identical sign-ups, the resulting row and two identical removals. */
export interface TenantDirectoryReport {
  readonly tenantId: string;
  readonly placements: readonly CallOutcome<unknown>[];
  readonly placedRows: readonly DirectoryRow[];
  readonly removals: readonly CallOutcome<unknown>[];
  readonly rowsAfterRemoval: readonly DirectoryRow[];
  /** What the sign-up of a group the service does not have returns. */
  readonly unknownGroup: CallOutcome<unknown>;
}

/**
 * Calls the tenant directory operations of a running service, as the sign-up saga does: places a new
 * tenant twice in the second group and removes it twice, like a repeated compensation.
 */
export class TenantDirectoryRehearsal {
  private readonly ids = new UuidV7IdGenerator(
    new SystemClock(),
    new SystemRandomSource(),
  );

  constructor(
    private readonly operations: TenantDirectoryOperations,
    private readonly internal: InternalOperationsClient,
    private readonly servers: ServiceTestServers,
  ) {}

  /** The service logical shard in the rehearsal group. */
  expectedShard(): string {
    return this.servers.shards()[1].database;
  }

  async rehearse(): Promise<TenantDirectoryReport> {
    const tenantId = this.ids.next().toString();
    const entry = {
      tenantId,
      region: ProvisionedService.REGION,
      groups: [ProvisionedService.GROUPS[1]],
      dedicated: false,
    };
    const place = this.operations.tenantDirectoryPlace;
    const remove = this.operations.tenantDirectoryRemove;
    const placements = [
      await this.internal.invoke(place, entry, tenantId),
      await this.internal.invoke(place, entry, tenantId),
    ];
    const placedRows = await this.rowsOf(tenantId);
    const removals = [
      await this.internal.invoke(remove, { tenantId }, tenantId),
      await this.internal.invoke(remove, { tenantId }, tenantId),
    ];
    const unknownGroup = await this.internal.invoke(place, {
      ...entry,
      tenantId: this.ids.next().toString(),
      groups: ['group-9'],
    });
    return {
      tenantId,
      placements,
      placedRows,
      removals,
      rowsAfterRemoval: await this.rowsOf(tenantId),
      unknownGroup,
    };
  }

  private rowsOf(tenantId: string): Promise<readonly DirectoryRow[]> {
    return this.servers
      .catalog()
      .rows<DirectoryRow>(
        `SELECT region, shard_group, status FROM shard_directory WHERE tenant_id = '${tenantId}'`,
      );
  }
}
