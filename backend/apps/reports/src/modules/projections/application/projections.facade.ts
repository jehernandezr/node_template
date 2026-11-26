import type {
  ActivityPoint,
  DeliveryPoint,
  InvoicePoint,
  StatusCount,
} from '../domain/projection-points.js';
import type { BucketedRange, ReportRange } from '../domain/report-range.js';

/** What `projections` offers the reports: aggregates over the projections of the tenant's shard. */
export abstract class ProjectionsFacade {
  /**
   * Counts the tenant tasks by status in the range.
   * @param tenantId Tenant to read.
   * @param range Report range.
   * @returns One count per status.
   */
  abstract taskStatusCounts(
    tenantId: string,
    range: ReportRange,
  ): Promise<readonly StatusCount[]>;
  /**
   * Counts the tasks created and done per bucket.
   * @param tenantId Tenant to read.
   * @param range Report range with its bucket.
   * @returns One point per bucket.
   */
  abstract taskActivity(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly ActivityPoint[]>;
  /**
   * Sums the invoices issued, paid and failed per bucket.
   * @param tenantId Tenant to read.
   * @param range Report range with its bucket.
   * @returns One point per bucket.
   */
  abstract invoiceSummary(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly InvoicePoint[]>;
  /**
   * Counts the notifications delivered per bucket.
   * @param tenantId Tenant to read.
   * @param range Report range with its bucket.
   * @returns One point per bucket.
   */
  abstract deliverySummary(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly DeliveryPoint[]>;
}
