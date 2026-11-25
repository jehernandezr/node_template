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

/** Abre un ledger con un id nuevo en cada ejecución: repetirla sin idempotencia dejaría dos filas. */
export const OpenLedgerOperation = defineOperation({
  id: 'ledger.ledgers.open.v1',
  input: z.object({ name: z.string().min(1) }),
  output: z.object({ id: IdSchema }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Operación del servicio de prueba, fuera de toda saga.',
  timeoutMs: 3_000,
  description: 'Abre un ledger del tenant de la llamada.',
});

/** Suma al total de un ledger: procesarlo dos veces dejaría el total con el doble. */
export const LedgerCredited = defineEvent({
  type: 'ledger.ledgers.credited.v1',
  payload: z.object({
    ledgerId: IdSchema,
    amount: z.number().int().positive(),
  }),
  description: 'Se abonó un monto a un ledger.',
});

export const ledgerContract = defineServiceContract({
  service: 'ledger',
  description: 'Servicio de prueba con datos de tenant que se trasladan.',
  operations: {
    ...LedgerTenantMoveOperations,
    ...LedgerTenantDirectoryOperations,
    openLedger: OpenLedgerOperation,
  },
});

/** Cómo despliega la prueba el servicio. */
export interface LedgerServiceOptions {
  /**
   * Con `true`, como los servicios, la llave de idempotencia de la API interna vive en el catálogo; sin él vive en
   * el shard del tenant.
   */
  readonly requireScope: boolean;
}

/** El handler de la operación que abre ledgers, en la transacción que abre la API interna para la llamada. */
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

/** El consumidor de los abonos, en el shard del tenant del mensaje. */
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
 * El negocio del servicio de prueba: sus operaciones de traslado y de directorio, la que abre ledgers y el consumidor
 * de abonos.
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

/** La definición del servicio de prueba, con sus tablas en los shards. */
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
