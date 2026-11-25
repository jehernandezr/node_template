import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/**
 * `payment_attempts`: cada intento de cobro de una factura, anotado antes de pedirlo, y lo que respondió el proveedor.
 * La llave única por número de intento es la reserva: dos corridas no pueden pedir el mismo cobro.
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
