import { ClaimState } from '@platform/kernel';
import { Check, Entity, Index } from 'typeorm';
import { ClaimRecordEntity } from './claim-record.entity.js';
import { EnumSql } from './enum-sql.js';

/** `idempotency_keys`: estado de tres fases de las operaciones internas, en la base del servicio o de cada shard. */
@Entity({ name: 'idempotency_keys' })
@Check('idempotency_keys_state_check', `"state" IN (${EnumSql.of(ClaimState)})`)
@Index('idempotency_keys_updated_idx', ['state', 'updatedAt'])
export class IdempotencyKeyEntity extends ClaimRecordEntity {}
