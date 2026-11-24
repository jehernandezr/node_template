import { Injectable, Module } from '@nestjs/common';
import {
  Compensation,
  defineOperation,
  defineServiceContract,
  defineTenantMoveOperations,
  IdSchema,
} from '@contracts/platform';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { IdGenerator, TransactionManager } from '@platform/kernel';
import type { TypeOrmUnitOfWork } from '@platform/persistence';
import { CallOutcome } from '@platform/primitives';
import type { ServiceDefinition } from '@platform/service';
import { ShardKey } from '@platform/sharding';
import { ServiceDefinitionBuilder } from '@platform/service/test-utils';
import { z } from 'zod';
import { LedgerManifest } from '../../../__tests__/utils/index.js';
import { TenantMoveModule } from '../../tenant-move.module.js';
import { LedgerShardMigration1900000000030 } from './ledger-shard-migration.js';

export const LedgerTenantMoveOperations = defineTenantMoveOperations('ledger');

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

export const ledgerContract = defineServiceContract({
  service: 'ledger',
  description: 'Servicio de prueba con datos de tenant que se trasladan.',
  operations: {
    ...LedgerTenantMoveOperations,
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

/** El negocio del servicio de prueba: sus operaciones de traslado y la que abre ledgers. */
@Module({
  imports: [
    TenantMoveModule.forFeature({
      operations: LedgerTenantMoveOperations,
      manifest: LedgerManifest,
    }),
  ],
  providers: [LedgerOpenings],
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
      })
      .build();
  }
}
