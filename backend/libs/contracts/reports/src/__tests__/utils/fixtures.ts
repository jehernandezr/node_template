import {
  ReportColumnKind,
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportType,
} from '../../enums/reports.enum.js';

/** Fixed UUIDv7 identifiers so tests are reproducible. */
export const Ids = {
  user: '0190f2a4-7b3c-7d4e-8f00-000000000001',
  tenant: '0190f2a4-7b3c-7d4e-8f00-000000000002',
  item: '0190f2a4-7b3c-7d4e-8f00-000000000003',
  other: '0190f2a4-7b3c-7d4e-8f00-000000000004',
} as const;

/** Instante ISO 8601 fijo. */
export const Now = '2026-11-13T12:00:00.000Z';

/** UUID v4: does not meet the contract, which requires v7. */
export const UuidV4 = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/** Valid parameters of a daily November report. */
export const Params = {
  from: '2026-11-01',
  to: '2026-11-30',
  granularity: ReportGranularity.Day,
} as const;

/** User who requested the run, with their home tenant. */
export const Requester = {
  userId: Ids.user,
  homeTenantId: Ids.tenant,
} as const;

/** Ready run, without its result. */
export const RunSummary = {
  id: Ids.item,
  type: ReportType.TasksByStatus,
  status: ReportRunStatus.Ready,
  format: ReportFormat.Csv,
  params: Params,
  requestedBy: Requester,
  createdAt: Now,
  completedAt: Now,
  expiresAt: Now,
} as const;

/** Result with one text column and one row. */
export const Result = {
  columns: [{ key: 'status', header: 'Estado', kind: ReportColumnKind.Text }],
  rows: [{ cells: ['open'] }],
} as const;
