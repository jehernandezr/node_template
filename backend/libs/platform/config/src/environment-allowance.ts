import type { z } from 'zod';
import type { DeployEnvironment } from './enums/deploy-environment.enum.js';

/**
 * The values one configuration variable may take in each deployed environment, so a fake or development adapter
 * cannot start where it would pretend to charge or deliver. An environment it does not list accepts any value.
 */
export class EnvironmentAllowance<T extends string> {
  constructor(
    private readonly variable: string,
    private readonly allowed: Readonly<
      Partial<Record<DeployEnvironment, readonly T[]>>
    >,
  ) {}

  /**
   * Whether the value may be used in the environment.
   * @param environment Deployed environment (`DEPLOY_ENVIRONMENT`).
   * @param value Value of the variable.
   * @returns True if the environment lists no values or lists this one.
   */
  allows(environment: DeployEnvironment, value: T): boolean {
    const values = this.allowed[environment];
    return values === undefined || values.includes(value);
  }

  /**
   * Adds an issue on the variable when the value is not allowed in the environment. The message names the
   * allowed values, never the received one.
   * @param environment Deployed environment (`DEPLOY_ENVIRONMENT`).
   * @param value Value of the variable.
   * @param ctx Refinement context of the schema that holds the variable.
   */
  check(environment: DeployEnvironment, value: T, ctx: z.RefinementCtx): void {
    if (this.allows(environment, value)) {
      return;
    }
    ctx.addIssue({
      code: 'custom',
      path: [this.variable],
      message: `${this.variable} must be ${(this.allowed[environment] ?? []).join(' or ')} in ${environment}`,
    });
  }
}
