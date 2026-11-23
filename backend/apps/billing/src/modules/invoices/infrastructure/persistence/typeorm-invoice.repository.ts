import { Injectable } from '@nestjs/common';
import type { InvoiceStatus } from '@contracts/billing';
import { IdGenerator } from '@platform/kernel';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { In, type EntityManager } from 'typeorm';
import {
  InvoiceRepository,
  type InvoicePageRequest,
} from '../../domain/invoice.repository.js';
import type { Invoice } from '../../domain/invoice.js';
import { InvoiceLineEntity } from './entities/invoice-line.entity.js';
import { InvoiceEntity } from './entities/invoice.entity.js';
import { InvoiceMapper } from './invoice.mapper.js';

/** `InvoiceRepository` sobre `invoices` e `invoice_lines` del shard del tenant. Las líneas no cambian. */
@Injectable()
export class TypeOrmInvoiceRepository
  extends TenantIsolatedRepository
  implements InvoiceRepository
{
  constructor(
    kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super(kit);
  }

  async insert(invoice: Invoice): Promise<void> {
    await this.insertOwned(InvoiceEntity, InvoiceMapper.toRow(invoice));
    const state = invoice.snapshot();
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.insert(
        InvoiceLineEntity,
        state.lines.map((line, position) => ({
          id: this.ids.next().toString(),
          tenantId,
          invoiceId: state.id,
          position,
          kind: line.kind,
          description: line.description,
          amountMinor: String(line.amountMinor),
        })),
      ),
    );
  }

  async find(invoiceId: string): Promise<Invoice | undefined> {
    const tenantId = this.tenantId();
    return this.readPrimary(async (manager) => {
      const row = await manager.findOneBy(InvoiceEntity, {
        id: invoiceId,
        tenantId,
      });
      return row === null
        ? undefined
        : (await this.withLines(manager, [row]))[0];
    });
  }

  update(invoice: Invoice): Promise<void> {
    return this.updateOwned(InvoiceEntity, InvoiceMapper.toRow(invoice));
  }

  async page(request: InvoicePageRequest): Promise<readonly Invoice[]> {
    const tenantId = this.tenantId();
    return this.read(async (manager) => {
      const query = manager
        .createQueryBuilder(InvoiceEntity, 'invoice')
        .where('invoice.tenantId = :tenantId', { tenantId })
        .orderBy('invoice.id', 'DESC')
        .take(request.limit);
      if (request.status !== undefined) {
        query.andWhere('invoice.status = :status', { status: request.status });
      }
      if (request.afterId !== undefined) {
        query.andWhere('invoice.id < :afterId', { afterId: request.afterId });
      }
      return this.withLines(manager, await query.getMany());
    });
  }

  any(status?: InvoiceStatus): Promise<boolean> {
    const tenantId = this.tenantId();
    return this.readPrimary((manager) =>
      manager.existsBy(
        InvoiceEntity,
        status === undefined ? { tenantId } : { tenantId, status },
      ),
    );
  }

  private async withLines(
    manager: EntityManager,
    rows: readonly InvoiceEntity[],
  ): Promise<Invoice[]> {
    const lines =
      rows.length === 0
        ? []
        : await manager.findBy(InvoiceLineEntity, {
            invoiceId: In(rows.map((row) => row.id)),
          });
    return rows.map((row) =>
      InvoiceMapper.toDomain(
        row,
        lines.filter((line) => line.invoiceId === row.id),
      ),
    );
  }
}
