import { Injectable, Module } from '@nestjs/common';
import {
  Compensation,
  defineEvent,
  defineOperation,
  defineServiceContract,
  defineTenantDirectoryOperations,
  defineTenantMoveOperations,
  IdSchema,
} from '@contracts/platform';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { IdGenerator, TransactionManager } from '@platform/kernel';
import { Subscribe } from '@platform/messaging/nest';
import type { TypeOrmUnitOfWork } from '@platform/persistence';
import { CallOutcome } from '@platform/primitives';
import type { ServiceDefinition } from '@platform/service';
import { ShardKey } from '@platform/sharding';
import { ServiceDefinitionBuilder } from '@platform/service/test-utils';
import { z } from 'zod';
import { LedgerManifest } from '../../../__tests__/utils/index.js';
import { tenantMoveErrorCatalog } from '../../../errors/tenant-move-error-catalog.js';
import { TenantDirectoryModule } from '../../tenant-directory.module.js';
import { TenantMoveModule } from '../../tenant-move.module.js';
import { LedgerShardMigration1900000000030 } from './ledger-shard-migration.js';

export const LedgerTenantMoveOperations = defineTenantMoveOperations('ledger');

export const LedgerTenantDirectoryOperations =
  defineTenantDirectoryOperations('ledger');

/** Opens a ledger with a new id on each run: repeating it without idempotency would leave two rows. */
export const OpenLedgerOperation = defineOperation({
  id: 'ledger.ledgers.open.v1',
  input: z.object({ name: z.string().min(1) }),
  output: z.object({ id: IdSchema }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Test service operation, outside any saga.',
  timeoutMs: 3_000,
  description: 'Opens a ledger for the calling tenant.',
});

/** Adds to a ledger total: processing it twice would leave the total doubled. */
export const LedgerCredited = defineEvent({
  type: 'ledger.ledgers.credited.v1',
  payload: z.object({
    ledgerId: IdSchema,
    amount: z.number().int().positive(),
  }),
  description: 'An amount was credited to a ledger.',
});

export const ledgerContract = defineServiceContract({
  service: 'ledger',
  description: 'Test service with tenant data that is moved.',
  operations: {
    ...LedgerTenantMoveOperations,
    ...LedgerTenantDirectoryOperations,
    openLedger: OpenLedgerOperation,
  },
});

/** How the test deploys the service. */
export interface LedgerServiceOptions {
  /**
   * With `true`, as in the services, the internal API idempotency key lives in the catalog; without it, it lives on
   * the tenant shard.
   */
  readonly requireScope: boolean;
}

/** The handler of the operation that opens ledgers, in the transaction the internal API opens for the call. */
@Injectable()
export class LedgerOpenings {
  constructor(
    private readonly transactions: TransactionManager<TypeOrmUnitOfWork>,
    private readonly ids: IdGenerator,
  ) {}

  @InternalHandler(OpenLedgerOperation)
  async open(input: {
    readonly name: string;
  }): Promise<HandlerResult<{ id: string }>> {
    const id = this.ids.next().toString();
    await this.transactions.runInTransaction((uow) =>
      uow.manager.query(
        "INSERT INTO ledgers (id, tenant_id, name, total) VALUES ($1, current_setting('app.tenant_id')::uuid, $2, 0)",
        [id, input.name],
      ),
    );
    return { outcome: CallOutcome.success({ id }) };
  }
}

/** The credits consumer, on the shard of the message tenant. */
@Injectable()
export class LedgerCredits {
  constructor(
    private readonly transactions: TransactionManager<TypeOrmUnitOfWork>,
  ) {}

  @Subscribe(LedgerCredited)
  async credit(data: {
    readonly ledgerId: string;
    readonly amount: number;
  }): Promise<void> {
    await this.transactions.runInTransaction((uow) =>
      uow.manager.query('UPDATE ledgers SET total = total + $2 WHERE id = $1', [
        data.ledgerId,
        data.amount,
      ]),
    );
  }
}

/**
 * The business of the test service: its move and directory operations, the one that opens ledgers and the credits
 * consumer.
 */
@Module({
  imports: [
    TenantMoveModule.forFeature({
      operations: LedgerTenantMoveOperations,
      manifest: LedgerManifest,
    }),
    TenantDirectoryModule.forFeature({
      service: ledgerContract.service,
      operations: LedgerTenantDirectoryOperations,
      manifest: LedgerManifest,
    }),
  ],
  providers: [LedgerOpenings, LedgerCredits],
})
export class LedgerRootModule {}

/** The test service definition, with its tables on the shards. */
export class LedgerService {
  static definition(
    options: LedgerServiceOptions = { requireScope: true },
  ): ServiceDefinition {
    return ServiceDefinitionBuilder.aDefinition(ledgerContract.service)
      .with({
        contract: ledgerContract,
        rootModule: LedgerRootModule,
        migrations: {
          catalog: { entities: [], migrations: [] },
          shard: {
            entities: [],
            migrations: [LedgerShardMigration1900000000030],
          },
        },
        sharding: {
          defaultKey: ShardKey.Tenant,
          requireScope: options.requireScope,
        },
        errorCatalogs: [tenantMoveErrorCatalog],
      })
      .build();
  }
}
