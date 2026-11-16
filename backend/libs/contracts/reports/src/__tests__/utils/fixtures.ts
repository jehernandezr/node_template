import {
  ReportColumnKind,
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportType,
} from '../../enums/reports.enum.js';

/** Identificadores UUIDv7 fijos para que las pruebas sean reproducibles. */
export const Ids = {
  user: '0190f2a4-7b3c-7d4e-8f00-000000000001',
  tenant: '0190f2a4-7b3c-7d4e-8f00-000000000002',
  item: '0190f2a4-7b3c-7d4e-8f00-000000000003',
  other: '0190f2a4-7b3c-7d4e-8f00-000000000004',
} as const;

/** Instante ISO 8601 fijo. */
export const Now = '2026-11-13T12:00:00.000Z';

/** UUID v4: no cumple el contrato, que exige v7. */
export const UuidV4 = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/** Parámetros válidos de un reporte diario de noviembre. */
export const Params = {
  from: '2026-11-01',
  to: '2026-11-30',
  granularity: ReportGranularity.Day,
} as const;

/** Usuario que pidió la ejecución, con su tenant de origen. */
export const Requester = {
  userId: Ids.user,
  homeTenantId: Ids.tenant,
} as const;

/** Ejecución lista, sin su resultado. */
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

/** Resultado con una columna de texto y una fila. */
export const Result = {
  columns: [{ key: 'status', header: 'Estado', kind: ReportColumnKind.Text }],
  rows: [{ cells: ['open'] }],
} as const;
