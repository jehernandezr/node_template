import { Injectable } from '@nestjs/common';
import { IdGenerator } from '@platform/kernel';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { InvoiceNumbering } from '../../domain/invoice-numbering.js';

/**
 * Sequence in `invoice_sequences` with a single `INSERT ... ON CONFLICT ... RETURNING`: the row lock
 * orders two concurrent closings of the same tenant and neither repeats a number.
 */
@Injectable()
export class TypeOrmInvoiceNumbering
  extends TenantIsolatedRepository
  implements InvoiceNumbering
{
  constructor(
    kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super(kit);
  }

  async next(series: string): Promise<number> {
    const tenantId = this.tenantId();
    const rows: { last_number: number }[] = await this.write((manager) =>
      manager.query(
        `INSERT INTO "invoice_sequences" ("id", "tenant_id", "series", "last_number", "version") VALUES ($1, $2, $3, 1, 1) ON CONFLICT ("tenant_id", "series") DO UPDATE SET "last_number" = "invoice_sequences"."last_number" + 1, "version" = "invoice_sequences"."version" + 1, "updated_at" = now() RETURNING "last_number"`,
        [this.ids.next().toString(), tenantId, series],
      ),
    );
    return Number(rows[0]?.last_number);
  }
}
