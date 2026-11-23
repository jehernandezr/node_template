import type { Plan, PlanState } from './plan.js';

/** Catálogo de planes, compartido por todos los tenants. */
export abstract class PlanCatalog {
  abstract available(): Promise<readonly Plan[]>;
  abstract find(planId: string): Promise<Plan | undefined>;
  abstract findByCode(code: string): Promise<Plan | undefined>;
  /** Crea el plan o reemplaza el del mismo `code`, con sus cuotas. Devuelve el plan guardado. */
  abstract save(plan: Omit<PlanState, 'id'>, newId: string): Promise<Plan>;
}
