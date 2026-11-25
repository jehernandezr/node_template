import type {
  ActivityPoint,
  DeliveryPoint,
  InvoicePoint,
  StatusCount,
} from '../domain/projection-points.js';
import type { BucketedRange, ReportRange } from '../domain/report-range.js';

/** What `projections` offers the reports: aggregates over the projections of the tenant's shard. */
export abstract class ProjectionsFacade {
  abstract taskStatusCounts(
    tenantId: string,
    range: ReportRange,
  ): Promise<readonly StatusCount[]>;
  abstract taskActivity(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly ActivityPoint[]>;
  abstract invoiceSummary(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly InvoicePoint[]>;
  abstract deliverySummary(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly DeliveryPoint[]>;
}
