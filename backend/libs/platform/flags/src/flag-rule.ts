/**
 * Rule of a flag. With `enabled` off the flag is off for everyone. When on, it applies to the context that
 * matches some explicit target (user, tenant, plan or group) or whose user falls within the
 * rollout percentage.
 */
export interface FlagRule {
  readonly flag: string;
  readonly enabled: boolean;
  /** Percentage of users, from 0 to 100, who get it even if they are not explicit targets. */
  readonly rolloutPercent: number;
  readonly users?: readonly string[];
  readonly tenants?: readonly string[];
  readonly plans?: readonly string[];
  readonly groups?: readonly string[];
}
