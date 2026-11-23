import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `payment_attempts`: cada intento de cobro de una factura y lo que respondió el proveedor. */
@Entity({ name: 'payment_attempts' })
@Index('payment_attempts_invoice_idx', ['tenantId', 'invoiceId'])
export class PaymentAttemptEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'invoice_id', nullable: false })
  invoiceId!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'varchar', length: 120, name: 'reference', nullable: true })
  reference!: string | null;

  @Column({ type: 'varchar', length: 200, name: 'reason', nullable: true })
  reason!: string | null;
}
