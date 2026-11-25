/** Settings for the lease renewal while a handler runs. */
export interface ClaimKeeperOptions {
  /** How often the lease is renewed. Defaults to 2 s. */
  readonly renewEveryMs?: number;
  /** How long the lease lasts from each renewal. Defaults to 10 s: several missed renewals before it expires. */
  readonly renewedLeaseMs?: number;
}
