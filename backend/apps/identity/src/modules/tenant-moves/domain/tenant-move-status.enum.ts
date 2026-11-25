/** Stage of a tenant move in `tenant_moves`. */
export enum TenantMoveStatus {
  /** The saga copies, freezes or points the services to the target. */
  Running = 'running',
  /** Every service already points to the target; the source waits for the grace period before being cleaned. */
  Switched = 'switched',
  /** The saga was compensated: the tenant remains in the source. */
  Aborted = 'aborted',
  /** The data left in the source has already been deleted. */
  CleanedUp = 'cleaned-up',
}
