import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** `login_attempts`, en el shard del usuario. Solo se inserta. */
@Entity({ name: 'login_attempts' })
@Index('login_attempts_user_idx', ['userId', 'attemptedAt'])
export class LoginAttemptEntity {
  @PrimaryColumn({ type: 'uuid', name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'varchar', length: 16, name: 'result', nullable: false })
  result!: string;

  @Column({ type: 'varchar', length: 32, name: 'reason', nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'ip', nullable: false })
  ip!: string;

  @Column({ type: 'uuid', name: 'device_id', nullable: true })
  deviceId!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'trace_id', nullable: true })
  traceId!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'attempted_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  attemptedAt!: Date;
}
