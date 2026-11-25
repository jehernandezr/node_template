import { Injectable } from '@nestjs/common';
import { InvoiceStatus, type Currency } from '@contracts/billing';
import {
  NotificationChannel,
  type NotificationType,
} from '@contracts/notifications';
import { IdGenerator } from '@platform/kernel';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import {
  FinanceProjection,
  type DeliveryProjectionChange,
  type InvoiceProjectionChange,
} from '../../domain/finance-projection.js';
import type {
  DeliveryPoint,
  InvoicePoint,
} from '../../domain/projection-points.js';
import type { BucketedRange } from '../../domain/report-range.js';

/**
 * `FinanceProjection` over `proj_invoices` and `proj_deliveries`. The invoice stores the progress of its status
 * (`status_progress`): a change only replaces the status if it progresses further.
 */
@Injectable()
export class TypeOrmFinanceProjection
  extends TenantIsolatedRepository
  implements FinanceProjection
{
  private static readonly UPSERT_INVOICE = `INSERT INTO "proj_invoices" AS p ("id", "tenant_id", "invoice_id", "number", "status", "status_progress", "currency", "total_minor", "issued_at", "paid_at", "failed_at", "version")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
    ON CONFLICT ("tenant_id", "invoice_id") DO UPDATE SET
      "status" = CASE WHEN EXCLUDED."status_progress" > p."status_progress" THEN EXCLUDED."status" ELSE p."status" END,
      "status_progress" = GREATEST(p."status_progress", EXCLUDED."status_progress"),
      "issued_at" = COALESCE(p."issued_at", EXCLUDED."issued_at"),
      "paid_at" = COALESCE(p."paid_at", EXCLUDED."paid_at"),
      "failed_at" = COALESCE(p."failed_at", EXCLUDED."failed_at"),
      "version" = p."version" + 1,
      "updated_at" = now()`;

  constructor(
    kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super(kit);
  }

  async applyInvoice(change: InvoiceProjectionChange): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.query(TypeOrmFinanceProjection.UPSERT_INVOICE, [
        this.ids.next().toString(),
        tenantId,
        change.invoiceId,
        change.number,
        change.status,
        change.progress,
        change.currency,
        change.totalMinor,
        change.issuedAt ?? null,
        change.paidAt ?? null,
        change.failedAt ?? null,
      ]),
    );
  }

  async applyDelivery(change: DeliveryProjectionChange): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.query(
        `INSERT INTO "proj_deliveries" ("id", "tenant_id", "notification_id", "type", "channels", "notified_at", "version") VALUES ($1, $2, $3, $4, $5, $6, 1) ON CONFLICT ("tenant_id", "notification_id") DO NOTHING`,
        [
          this.ids.next().toString(),
          tenantId,
          change.notificationId,
          change.type,
          [...change.channels],
          change.createdAt,
        ],
      ),
    );
  }

  async invoices(range: BucketedRange): Promise<readonly InvoicePoint[]> {
    const tenantId = this.tenantId();
    const rows: {
      period: string;
      currency: Currency;
      issued: string;
      paid: string;
      failed: string;
      issued_minor: string;
    }[] = await this.read((manager) =>
      manager.query(
        `SELECT to_char(date_trunc($4, "issued_at" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "period", "currency", count(*) AS "issued", count(*) FILTER (WHERE "status" = $5) AS "paid", count(*) FILTER (WHERE "status" = $6) AS "failed", sum("total_minor") AS "issued_minor"
         FROM "proj_invoices" WHERE "tenant_id" = $1 AND "issued_at" >= $2::date AND "issued_at" < $3::date + 1 GROUP BY 1, 2 ORDER BY 1, 2`,
        [
          tenantId,
          range.from,
          range.to,
          range.granularity,
          InvoiceStatus.Paid,
          InvoiceStatus.Failed,
        ],
      ),
    );
    return rows.map((row) => ({
      period: row.period,
      currency: row.currency,
      issued: Number(row.issued),
      paid: Number(row.paid),
      failed: Number(row.failed),
      issuedMinor: Number(row.issued_minor),
    }));
  }

  async deliveries(range: BucketedRange): Promise<readonly DeliveryPoint[]> {
    const tenantId = this.tenantId();
    const rows: {
      period: string;
      type: NotificationType;
      in_app: string;
      push: string;
      email: string;
    }[] = await this.read((manager) =>
      manager.query(
        `SELECT to_char(date_trunc($4, "notified_at" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "period", "type", count(*) FILTER (WHERE $5 = ANY("channels")) AS "in_app", count(*) FILTER (WHERE $6 = ANY("channels")) AS "push", count(*) FILTER (WHERE $7 = ANY("channels")) AS "email"
         FROM "proj_deliveries" WHERE "tenant_id" = $1 AND "notified_at" >= $2::date AND "notified_at" < $3::date + 1 GROUP BY 1, 2 ORDER BY 1, 2`,
        [
          tenantId,
          range.from,
          range.to,
          range.granularity,
          NotificationChannel.InApp,
          NotificationChannel.Push,
          NotificationChannel.Email,
        ],
      ),
    );
    return rows.map((row) => ({
      period: row.period,
      type: row.type,
      inApp: Number(row.in_app),
      push: Number(row.push),
      email: Number(row.email),
    }));
  }
}
