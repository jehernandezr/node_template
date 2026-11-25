import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `invoice_lines`: the lines of an invoice, in the order they were issued. */
@Entity({ name: 'invoice_lines' })
@Index('invoice_lines_invoice_idx', ['tenantId', 'invoiceId', 'position'])
export class InvoiceLineEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'invoice_id', nullable: false })
  invoiceId!: string;

  @Column({ type: 'integer', name: 'position', nullable: false })
  position!: number;

  @Column({ type: 'varchar', length: 16, name: 'kind', nullable: false })
  kind!: string;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'description',
    nullable: false,
  })
  description!: string;

  @Column({ type: 'bigint', name: 'amount_minor', nullable: false })
  amountMinor!: string;
}
