import { ClaimState } from '@platform/kernel';
import { Check, Column, Entity, Index } from 'typeorm';
import { ClaimRecordEntity } from './claim-record.entity.js';
import { EnumSql } from './enum-sql.js';

/**
 * `processed_messages`: consumer idempotency; the key is `(consumer, message id)`. It goes in each shard
 * to complete the message in the same transaction as the handler's effects. The message tenant goes in
 * `tenant_id` so the tenant move takes the processed records along and a redelivery at the destination is not repeated.
 */
@Entity({ name: 'processed_messages' })
@Check(
  'processed_messages_state_check',
  `"state" IN (${EnumSql.of(ClaimState)})`,
)
@Index('processed_messages_updated_idx', ['state', 'updatedAt'])
@Index('processed_messages_tenant_idx', ['tenantId'], {
  where: '"tenant_id" IS NOT NULL',
})
export class ProcessedMessageEntity extends ClaimRecordEntity {
  @Column({ type: 'text', name: 'tenant_id', nullable: true })
  tenantId!: string | null;
}
