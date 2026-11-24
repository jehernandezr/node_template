import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@contracts/billing';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import {
  InvoiceMaintenance,
  type TenantInvoice,
} from '../../domain/invoice-maintenance.js';
import { InvoiceEntity } from './entities/invoice.entity.js';

/**
 * Consultas de `invoices` en todos los shards, en transacciones de mantenimiento entre tenants, sin los tenants que
 * ya se trasladaron a otro shard.
 */
@Injectable()
export class TypeOrmInvoiceMaintenance extends InvoiceMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async uncollected(): Promise<readonly TenantInvoice[]> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(connection.dataSource.manager, (manager) =>
        manager
          .createQueryBuilder(InvoiceEntity, 'invoice')
          .select(['invoice.id', 'invoice.tenantId'])
          .where('invoice.status = :status', { status: InvoiceStatus.Issued })
          .andWhere(TenantWriteFence.unfenced('invoice.tenant_id'))
          .orderBy('invoice.id', 'ASC')
          .getMany(),
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
