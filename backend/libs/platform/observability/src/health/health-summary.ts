import type { HealthReport, HealthState } from '@platform/kernel';

/** Result of checking all registered dependencies. */
export interface HealthSummary {
  /** The worst status of the dependencies: `Down` if any is down, `Degraded` if any is degraded, `Up` if there are none or all respond. */
  readonly state: HealthState;
  /** Report of each dependency by its `name`. */
  readonly checks: Readonly<Record<string, HealthReport>>;
}
