import { Column, Entity, PrimaryColumn } from 'typeorm';

/** `email_suppressions`, in the catalog: hashes of recipients who are not written to. */
@Entity({ name: 'email_suppressions' })
export class EmailSuppressionEntity {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'recipient_hash' })
  recipientHash!: string;

  @Column({ type: 'varchar', length: 64, name: 'reason', nullable: false })
  reason!: string;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
    nullable: false,
    default: () => 'now()',
  })
  createdAt!: Date;
}
