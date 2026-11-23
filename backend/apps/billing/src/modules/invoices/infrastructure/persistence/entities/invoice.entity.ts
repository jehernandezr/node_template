import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `invoices`: una factura por periodo cerrado de un tenant, con su consecutivo. */
@Entity({ name: 'invoices' })
@Index('invoices_tenant_number_key', ['tenantId', 'number'], { unique: true })
@Index('invoices_tenant_status_idx', ['tenantId', 'status', 'id'])
export class InvoiceEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 32, name: 'number', nullable: false })
  number!: string;

  @Column({ type: 'date', name: 'period_start', nullable: false })
  periodStart!: string;

  @Column({ type: 'date', name: 'period_end', nullable: false })
  periodEnd!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'varchar', length: 3, name: 'currency', nullable: false })
  currency!: string;

  @Column({ type: 'bigint', name: 'total_minor', nullable: false })
  totalMinor!: string;

  @Column({ type: 'timestamptz', name: 'issued_at', nullable: false })
  issuedAt!: Date;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'integer', name: 'failed_attempts', nullable: false })
  failedAttempts!: number;
}
