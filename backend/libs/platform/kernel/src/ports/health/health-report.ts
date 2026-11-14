import type { HealthState } from './health-state.enum.js';

export interface HealthReport {
  readonly state: HealthState;
  readonly detail?: string;
}
