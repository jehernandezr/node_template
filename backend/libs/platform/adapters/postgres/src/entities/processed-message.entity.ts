import { ClaimState } from '@platform/kernel';
import { Check, Entity, Index } from 'typeorm';
import { ClaimRecordEntity } from './claim-record.entity.js';
import { EnumSql } from './enum-sql.js';

/**
 * `processed_messages`: idempotencia de consumidores; la llave es `(consumidor, id del mensaje)`. Va en cada shard
 * para completar el mensaje en la misma transacción que los efectos del handler.
 */
@Entity({ name: 'processed_messages' })
@Check(
  'processed_messages_state_check',
  `"state" IN (${EnumSql.of(ClaimState)})`,
)
@Index('processed_messages_updated_idx', ['state', 'updatedAt'])
export class ProcessedMessageEntity extends ClaimRecordEntity {}
