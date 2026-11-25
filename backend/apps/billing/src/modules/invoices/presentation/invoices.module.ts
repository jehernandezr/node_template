import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { CollectInvoice } from '../application/collect-invoice.use-case.js';
import { CloseInvoicePeriodsJob } from '../application/close-invoice-periods.job.js';
import { InvoiceQueries } from '../application/invoice-queries.js';
import { InvoicesFacade } from '../application/invoices.facade.js';
import { IssueInvoice } from '../application/issue-invoice.use-case.js';
import { RecordPaymentNotice } from '../application/record-payment-notice.use-case.js';
import { SettleInvoice } from '../application/settle-invoice.use-case.js';
import { InvoiceMaintenance } from '../domain/invoice-maintenance.js';
import { InvoiceNumbering } from '../domain/invoice-numbering.js';
import { InvoiceRepository } from '../domain/invoice.repository.js';
import { InvoiceLineEntity } from '../infrastructure/persistence/entities/invoice-line.entity.js';
import { InvoiceSequenceEntity } from '../infrastructure/persistence/entities/invoice-sequence.entity.js';
import { InvoiceEntity } from '../infrastructure/persistence/entities/invoice.entity.js';
import { TypeOrmInvoiceMaintenance } from '../infrastructure/persistence/typeorm-invoice-maintenance.js';
import { TypeOrmInvoiceNumbering } from '../infrastructure/persistence/typeorm-invoice-numbering.js';
import { TypeOrmInvoiceRepository } from '../infrastructure/persistence/typeorm-invoice.repository.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesInternalOperations } from './invoices.internal-operations.js';

/** Invoices: period closing, numbering, charging and its result. Global only for its facade. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [InvoiceEntity, InvoiceLineEntity, InvoiceSequenceEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  controllers: [InvoicesController],
  providers: [
    TenantShard,
    { provide: InvoiceRepository, useClass: TypeOrmInvoiceRepository },
    { provide: InvoiceNumbering, useClass: TypeOrmInvoiceNumbering },
    { provide: InvoiceMaintenance, useClass: TypeOrmInvoiceMaintenance },
    IssueInvoice,
    SettleInvoice,
    RecordPaymentNotice,
    CollectInvoice,
    CloseInvoicePeriodsJob,
    InvoiceQueries,
    { provide: InvoicesFacade, useExisting: InvoiceQueries },
    InvoicesInternalOperations,
  ],
  exports: [InvoicesFacade],
})
export class InvoicesModule {}
