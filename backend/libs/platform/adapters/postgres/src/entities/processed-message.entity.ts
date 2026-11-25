import { ClaimState } from '@platform/kernel';
import { Check, Column, Entity, Index } from 'typeorm';
import { ClaimRecordEntity } from './claim-record.entity.js';
import { EnumSql } from './enum-sql.js';

/**
 * `processed_messages`: idempotencia de consumidores; la llave es `(consumidor, id del mensaje)`. Va en cada shard
 * para completar el mensaje en la misma transacción que los efectos del handler. El tenant del mensaje va en
 * `tenant_id` para que el traslado del tenant se lleve lo procesado y una reentrega en el destino no se repita.
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
