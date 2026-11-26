import { PlanCatalog } from '../../domain/plan-catalog.js';
import { Plan, type PlanState } from '../../domain/plan.js';

/** In-memory `PlanCatalog` keyed by code, as the unique code of the table. */
export class InMemoryPlanCatalog extends PlanCatalog {
  private readonly byCode = new Map<string, PlanState>();

  override async available(): Promise<readonly Plan[]> {
    return [...this.byCode.values()].map((state) => Plan.of(state));
  }

  override async find(planId: string): Promise<Plan | undefined> {
    const state = [...this.byCode.values()].find((plan) => plan.id === planId);
    return state === undefined ? undefined : Plan.of(state);
  }

  override async findByCode(code: string): Promise<Plan | undefined> {
    const state = this.byCode.get(code);
    return state === undefined ? undefined : Plan.of(state);
  }

  override async save(
    plan: Omit<PlanState, 'id'>,
    newId: string,
  ): Promise<Plan> {
    const id = this.byCode.get(plan.code)?.id ?? newId;
    const state = { ...plan, id };
    this.byCode.set(plan.code, state);
    return Plan.of(state);
  }
}
