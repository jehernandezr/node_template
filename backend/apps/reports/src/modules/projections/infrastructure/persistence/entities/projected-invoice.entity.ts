import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `proj_invoices`: each invoice of the tenant according to billing events. */
@Entity({ name: 'proj_invoices' })
@Index('proj_invoices_tenant_invoice_key', ['tenantId', 'invoiceId'], {
  unique: true,
})
export class ProjectedInvoiceEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'invoice_id', nullable: false })
  invoiceId!: string;

  @Column({ type: 'varchar', length: 32, name: 'number', nullable: false })
  number!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'smallint', name: 'status_progress', nullable: false })
  statusProgress!: number;

  @Column({ type: 'varchar', length: 3, name: 'currency', nullable: false })
  currency!: string;

  @Column({ type: 'bigint', name: 'total_minor', nullable: false })
  totalMinor!: string;

  @Column({ type: 'timestamptz', name: 'issued_at', nullable: true })
  issuedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'failed_at', nullable: true })
  failedAt!: Date | null;
}
