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
 * `invoices` queries across all shards, in cross-tenant maintenance transactions, excluding tenants that
 * have already moved to another shard.
 */
@Injectable()
export class TypeOrmInvoiceMaintenance extends InvoiceMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  /**
   * Finds in each shard the `Issued` or `Failed` invoices with an overdue `next_collection_at`, excluding fenced tenants.
   * @param now Reference instant.
   * @returns The invoices of all shards, ordered by id within each one.
   */
  async dueForCollection(now: Date): Promise<readonly TenantInvoice[]> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(connection.dataSource.manager, (manager) =>
        manager
          .createQueryBuilder(InvoiceEntity, 'invoice')
          .select(['invoice.id', 'invoice.tenantId'])
          .where('invoice.status IN (:...unpaid)', {
            unpaid: [InvoiceStatus.Issued, InvoiceStatus.Failed],
          })
          .andWhere('invoice.nextCollectionAt <= :now', { now })
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
