import type { ClaimState } from '@platform/kernel';
import { TimestampTransformer } from '@platform/persistence';
import { Column, PrimaryColumn } from 'typeorm';

/**
 * Columns of a three-phase claims table. `IdempotencyKeyEntity` and `ProcessedMessageEntity` extend it
 * and differ only by table, index and `CHECK`. Instants are `timestamptz` with the value of the app `Clock`.
 */
export abstract class ClaimRecordEntity {
  @PrimaryColumn({ type: 'text', name: 'key' })
  key!: string;

  @Column({ type: 'text', name: 'state', nullable: false })
  state!: ClaimState;

  @Column({ type: 'text', name: 'fingerprint', nullable: false })
  fingerprint!: string;

  @Column({ type: 'text', name: 'claim_token', nullable: true })
  claimToken!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'lease_until',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  leaseUntil!: Date | null;

  @Column({ type: 'integer', name: 'attempt', nullable: false })
  attempt!: number;

  @Column({ type: 'jsonb', name: 'result', nullable: true })
  result!: unknown;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  createdAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  updatedAt!: Date;
}
