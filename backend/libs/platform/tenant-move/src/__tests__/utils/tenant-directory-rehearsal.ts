import type { TenantDirectoryOperations } from '@contracts/platform';
import { UuidV7IdGenerator } from '@platform/kernel';
import type { CallOutcome } from '@platform/primitives';
import {
  ProvisionedService,
  type InternalOperationsClient,
  type ServiceTestServers,
} from '@platform/service/test-utils';

/** La fila de un tenant en el directorio de shards del catálogo. */
export interface DirectoryRow {
  readonly region: string;
  readonly shard_group: readonly string[];
  readonly status: string;
}

/** Lo que deja un ensayo: dos altas iguales, la fila que quedó y dos retiros iguales. */
export interface TenantDirectoryReport {
  readonly tenantId: string;
  readonly placements: readonly CallOutcome<unknown>[];
  readonly placedRows: readonly DirectoryRow[];
  readonly removals: readonly CallOutcome<unknown>[];
  readonly rowsAfterRemoval: readonly DirectoryRow[];
  /** Lo que responde el alta de un grupo que el servicio no tiene. */
  readonly unknownGroup: CallOutcome<unknown>;
}

/**
 * Llama las operaciones del directorio de tenants de un servicio en marcha, como lo hace la saga de alta: ubica dos
 * veces un tenant nuevo en el segundo grupo y lo retira dos veces, como la compensación que se repite.
 */
export class TenantDirectoryRehearsal {
  private readonly ids = new UuidV7IdGenerator();

  constructor(
    private readonly operations: TenantDirectoryOperations,
    private readonly internal: InternalOperationsClient,
    private readonly servers: ServiceTestServers,
  ) {}

  /** El shard lógico del servicio en el grupo del ensayo. */
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
