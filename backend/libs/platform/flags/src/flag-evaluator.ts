import type { FlagContext } from './flag-context.js';
import type { FlagRule } from './flag-rule.js';
import { FlagStore } from './flag-store.js';
import { RolloutBucket } from './rollout-bucket.js';

/** Decides which flags are on for a context. */
export class FlagEvaluator {
  constructor(private readonly store: FlagStore) {}

  /**
   * Lists the flags enabled for a user and tenant.
   * @param context User, tenant, groups and plan.
   * @returns The enabled flag names.
   */
  async enabledFlags(context: FlagContext): Promise<readonly string[]> {
    const rules = await this.store.rules();
    return rules
      .filter((rule) => FlagEvaluator.appliesTo(rule, context))
      .map((rule) => rule.flag);
  }

  /**
   * Tells whether one flag is enabled for a user and tenant.
   * @param flag Flag name.
   * @param context User, tenant, groups and plan.
   * @returns `true` when enabled.
   */
  async isEnabled(flag: string, context: FlagContext): Promise<boolean> {
    return (await this.enabledFlags(context)).includes(flag);
  }

  private static appliesTo(rule: FlagRule, context: FlagContext): boolean {
    if (!rule.enabled) {
      return false;
    }
    return (
      FlagEvaluator.isTargeted(rule, context) ||
      RolloutBucket.of(rule.flag, context.userId) < rule.rolloutPercent
    );
  }

  private static isTargeted(rule: FlagRule, context: FlagContext): boolean {
    const groups = context.groups ?? [];
    return (
      (rule.users?.includes(context.userId) ?? false) ||
      (rule.tenants?.includes(context.tenantId) ?? false) ||
      (context.plan !== undefined &&
        (rule.plans?.includes(context.plan) ?? false)) ||
      groups.some((group) => rule.groups?.includes(group) ?? false)
    );
  }
}
