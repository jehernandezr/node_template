import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `report_runs`: each report run of the tenant, with its result while it has not expired. */
@Entity({ name: 'report_runs' })
@Index('report_runs_tenant_idx', ['tenantId', 'id'])
@Index('report_runs_expiry_idx', ['status', 'expiresAt'])
export class ReportRunEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 32, name: 'type', nullable: false })
  type!: string;

  @Column({ type: 'varchar', length: 8, name: 'format', nullable: false })
  format!: string;

  @Column({ type: 'jsonb', name: 'params', nullable: false })
  params!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'uuid', name: 'requested_by', nullable: false })
  requestedBy!: string;

  @Column({
    type: 'uuid',
    name: 'requested_by_home_tenant_id',
    nullable: false,
  })
  requestedByHomeTenantId!: string;

  @Column({ type: 'jsonb', name: 'result', nullable: true })
  result!: Record<string, unknown> | null;

  @Column({ type: 'integer', name: 'result_bytes', nullable: true })
  resultBytes!: number | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'varchar', length: 64, name: 'failure_code', nullable: true })
  failureCode!: string | null;
}
