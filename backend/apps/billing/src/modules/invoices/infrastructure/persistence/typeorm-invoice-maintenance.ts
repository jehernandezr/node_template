import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@contracts/billing';
import { AcrossShards, TenantMaintenanceSession } from '@platform/persistence';
import {
  InvoiceMaintenance,
  type TenantInvoice,
} from '../../domain/invoice-maintenance.js';
import { InvoiceEntity } from './entities/invoice.entity.js';

/** Consultas de `invoices` en todos los shards, en transacciones de mantenimiento entre tenants. */
@Injectable()
export class TypeOrmInvoiceMaintenance extends InvoiceMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async uncollected(): Promise<readonly TenantInvoice[]> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(connection.dataSource.manager, (manager) =>
        manager.find(InvoiceEntity, {
          select: { id: true, tenantId: true },
          where: { status: InvoiceStatus.Issued },
          order: { id: 'ASC' },
        }),
      ),
    );
    return outcome.results.flatMap((result) =>
      result.value.map((row) => ({
        tenantId: row.tenantId,
        invoiceId: row.id,
      })),
    );
  }
}
