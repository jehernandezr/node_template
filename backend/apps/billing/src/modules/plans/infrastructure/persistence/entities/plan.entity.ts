import { VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `billing_plans`, en el catálogo: el plan y su precio fijo por periodo. */
@Entity({ name: 'billing_plans' })
@Index('billing_plans_code_key', ['code'], { unique: true })
export class PlanEntity extends VersionedEntity {
  @Column({ type: 'varchar', length: 40, name: 'code', nullable: false })
  code!: string;

  @Column({ type: 'varchar', length: 120, name: 'name', nullable: false })
  name!: string;

  @Column({ type: 'bigint', name: 'price_minor', nullable: false })
  priceMinor!: string;

  @Column({ type: 'varchar', length: 3, name: 'currency', nullable: false })
  currency!: string;

  @Column({ type: 'varchar', length: 16, name: 'periodicity', nullable: false })
  periodicity!: string;

  @Column({ type: 'text', array: true, name: 'features', nullable: false })
  features!: string[];
}
