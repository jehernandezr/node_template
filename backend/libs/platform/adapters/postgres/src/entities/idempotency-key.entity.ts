import { ClaimState } from '@platform/kernel';
import { Check, Column, Entity, Index } from 'typeorm';
import { ClaimRecordEntity } from './claim-record.entity.js';
import { EnumSql } from './enum-sql.js';

/**
 * `idempotency_keys`: estado de tres fases de las operaciones internas, en la base del servicio o de cada shard. El
 * tenant de la llamada va en `tenant_id` para que el traslado del tenant se lleve sus llaves.
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
