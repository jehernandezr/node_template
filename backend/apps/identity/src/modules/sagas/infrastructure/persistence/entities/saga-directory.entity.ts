import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** `identity_sagas`, in the catalog: the tenant in whose shard each saga lives and who requested it. */
@Entity({ name: 'identity_sagas' })
export class SagaDirectoryEntity {
  @PrimaryColumn({ type: 'uuid', name: 'saga_id' })
  sagaId!: string;

  @Column({ type: 'varchar', length: 64, name: 'saga', nullable: false })
  saga!: string;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: false })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'requested_by', nullable: false })
  requestedBy!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt?: Date;
}
