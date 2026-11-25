import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `invoice_sequences`: the last sequence number used by each tenant and series. */
@Entity({ name: 'invoice_sequences' })
@Index('invoice_sequences_tenant_series_key', ['tenantId', 'series'], {
  unique: true,
})
export class InvoiceSequenceEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 8, name: 'series', nullable: false })
  series!: string;

  @Column({ type: 'integer', name: 'last_number', nullable: false })
  lastNumber!: number;
}
