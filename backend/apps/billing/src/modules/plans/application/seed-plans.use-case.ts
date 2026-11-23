import { Injectable } from '@nestjs/common';
import { IdGenerator } from '@platform/kernel';
import { PlanCatalog } from '../domain/plan-catalog.js';
import type { Plan } from '../domain/plan.js';
import { SEED_PLANS } from './seed-plans.constants.js';

/** Repone los planes de la semilla por su código. Repetirla no duplica nada. */
@Injectable()
export class SeedPlans {
  constructor(
    private readonly catalog: PlanCatalog,
    private readonly ids: IdGenerator,
  ) {}

  async execute(): Promise<readonly Plan[]> {
    const saved: Plan[] = [];
    for (const plan of SEED_PLANS) {
      saved.push(await this.catalog.save(plan, this.ids.next().toString()));
    }
    return saved;
  }
}
