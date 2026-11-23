import { Column, Entity, PrimaryColumn } from 'typeorm';

/** `billing_plan_quotas`, en el catálogo: el límite de cada métrica de un plan y su precio por unidad. */
@Entity({ name: 'billing_plan_quotas' })
export class PlanQuotaEntity {
  @PrimaryColumn({ type: 'uuid', name: 'plan_id' })
  planId!: string;

  @PrimaryColumn({ type: 'varchar', length: 32, name: 'metric' })
  metric!: string;

  @Column({ type: 'bigint', name: 'quota_limit', nullable: false })
  limit!: string;

  @Column({ type: 'bigint', name: 'unit_price_minor', nullable: true })
  unitPriceMinor!: string | null;
}
