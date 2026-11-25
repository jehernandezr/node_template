import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/**
 * `payment_attempts`: each charge attempt of an invoice, recorded before requesting it, and what the provider answered.
 * The unique key per attempt number is the reservation: two runs cannot request the same charge.
 */
@Entity({ name: 'payment_attempts' })
@Index(
  'payment_attempts_invoice_attempt_key',
  ['tenantId', 'invoiceId', 'attempt'],
  { unique: true },
)
export class PaymentAttemptEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'invoice_id', nullable: false })
  invoiceId!: string;

  @Column({ type: 'integer', name: 'attempt', nullable: false })
  attempt!: number;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'timestamptz', name: 'requested_at', nullable: false })
  requestedAt!: Date;

  @Column({ type: 'varchar', length: 120, name: 'reference', nullable: true })
  reference!: string | null;

  @Column({ type: 'varchar', length: 200, name: 'reason', nullable: true })
  reason!: string | null;
}
