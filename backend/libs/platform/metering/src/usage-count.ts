/**
 * What a tenant consumed of a metric in a window. The metric is text: the counter store does not
 * know the billing catalog, and `UsageFlushJob` validates it against the catalog before sending it.
 */
export interface UsageCount {
  readonly tenantId: string;
  readonly metric: string;
  readonly quantity: number;
}

/** The counters of a one-minute window, identified by its start. */
export interface UsageWindow {
  readonly start: Date;
  readonly counts: readonly UsageCount[];
}
