import { Pagination } from '@contracts/platform';

/** reports default values. */
export const ReportsDefaults = {
  maxResultBytes: 1_000_000,
  resultTtlDays: 30,
  pageSize: 20,
  /** Task changes per page when backfilling a tenant's projections. */
  backfillPageSize: Pagination.maxLimit,
  /** Pages one run backfills per tenant: each call fits in the budget of an internal operation. */
  backfillPagesPerRun: 10,
  /**
   * Who remains as requester of a deleted user's runs: a valid UUIDv7 that the
   * `IdGenerator` never emits (its timestamp is zero).
   */
  erasedRequester: {
    userId: '00000000-0000-7000-8000-000000000000',
    homeTenantId: '00000000-0000-7000-8000-000000000000',
  },
} as const;
