import { ClaimState } from '@platform/kernel';
import { Check, Column, Entity, Index } from 'typeorm';
import { ClaimRecordEntity } from './claim-record.entity.js';
import { EnumSql } from './enum-sql.js';

/**
 * `idempotency_keys`: three-phase state of internal operations, in the database of the service or of each shard. The
 * tenant of the call goes in `tenant_id` so the tenant move takes its keys along.
 */
@Entity({ name: 'idempotency_keys' })
@Check('idempotency_keys_state_check', `"state" IN (${EnumSql.of(ClaimState)})`)
@Index('idempotency_keys_updated_idx', ['state', 'updatedAt'])
@Index('idempotency_keys_tenant_idx', ['tenantId'], {
  where: '"tenant_id" IS NOT NULL',
})
export class IdempotencyKeyEntity extends ClaimRecordEntity {
  @Column({ type: 'text', name: 'tenant_id', nullable: true })
  tenantId!: string | null;
}
