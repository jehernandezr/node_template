/** Options of `ClaimTable`. */
export interface ClaimTableOptions<R> {
  /** Converts the result to JSON. By default it stores it as is in `jsonb`. */
  readonly serialize?: (result: R) => unknown;
  /** Rebuilds the result from the stored `jsonb`. */
  readonly deserialize?: (stored: unknown) => R;
  /** Whether the table has `tenant_id` and stores the claim's `tenantId` there. */
  readonly tenantColumn?: boolean;
}
