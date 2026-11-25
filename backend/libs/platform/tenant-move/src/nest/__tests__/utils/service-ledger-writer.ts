import type { INestApplicationContext } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import { ActorType, RequestContextStore } from '@platform/observability';
import { ShardScope, type TypeOrmUnitOfWork } from '@platform/persistence';
import {
  ShardKey,
  ShardingError,
  ShardingErrorCode,
  WrongRegionError,
} from '@platform/sharding';

/** A row the service committed: its id and its resulting total. */
export interface AckedLedger {
  readonly id: string;
  readonly total: string;
}

/**
 * Writes ledgers of a tenant through the persistence of a service process, as a use case would. It inserts
 * new rows and changes its own, and tracks what was committed: a write the move rejects does not count.
 * When the process answers that the tenant lives in another region, it follows the URL it is given, like the front SDK.
 */
export class ServiceLedgerWriter {
  private readonly acked = new Map<string, string>();
  private readonly redirects: string[] = [];
  private sequence = 0;

  constructor(
    private readonly tenantId: string,
    private readonly ids: () => string,
    private readonly regions: ReadonlyMap<string, INestApplicationContext>,
    private current: INestApplicationContext,
  ) {}

  async writeOnce(): Promise<void> {
    this.sequence += 1;
    const owned = [...this.acked.keys()];
    const id =
      owned.length > 0 && this.sequence % 3 === 0
        ? (owned[this.sequence % owned.length] ?? this.ids())
        : this.ids();
    const total = String(1_000_000 + this.sequence);
    try {
      await this.write(id, total);
      this.acked.set(id, total);
    } catch (error) {
      this.handle(error);
    }
  }

  ackedRows(): readonly AckedLedger[] {
    return [...this.acked]
      .map(([id, total]) => ({ id, total }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /** The URLs the wrong-region responses sent it to. */
  redirectedTo(): readonly string[] {
    return this.redirects;
  }

  private write(id: string, total: string): Promise<unknown> {
    const requests = this.current.get(RequestContextStore);
    const transactions =
      this.current.get<TransactionManager<TypeOrmUnitOfWork>>(
        TransactionManager,
      );
    const scope = this.current.get(ShardScope);
    return requests.run(
      {
        tenantId: this.tenantId,
        actorId: 'ledger-writer',
        actorType: ActorType.System,
      },
      () =>
        scope.run({ tenantId: this.tenantId, keyKind: ShardKey.Tenant }, () =>
          transactions.runInTransaction((uow) =>
            uow.manager.query(
              `INSERT INTO ledgers (id, tenant_id, name, total, updated_at) VALUES ($1, $2, $3, $4, clock_timestamp())
               ON CONFLICT (id) DO UPDATE SET total = EXCLUDED.total, version = ledgers.version + 1, updated_at = clock_timestamp()`,
              [id, this.tenantId, `ledger ${id}`, total],
            ),
          ),
        ),
    );
  }

  private handle(error: unknown): void {
    if (error instanceof WrongRegionError) {
      const apiBaseUrl = String(error.details?.['apiBaseUrl']);
      const next = this.regions.get(apiBaseUrl);
      if (next === undefined) {
        throw error;
      }
      this.redirects.push(apiBaseUrl);
      this.current = next;
      return;
    }
    if (
      error instanceof ShardingError &&
      error.code === ShardingErrorCode.TenantMigrating
    ) {
      return;
    }
    throw error;
  }
}
