import { z } from 'zod';
import { envNumber, serviceConfigSchema } from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';
import { ReportsDefaults } from '../shared/constants/reports-defaults.constants.js';
import { ReportResultStoreKind } from '../shared/enums/report-result-store-kind.enum.js';

/** reports configuration. */
export const reportsConfigSchema = serviceConfigSchema.extend({
  ...internalHttpConfigSchema.shape,
  /** Maximum size of a run's result, in bytes of its JSON. */
  REPORTS_MAX_RESULT_BYTES: envNumber({ min: 1024 }).default(
    ReportsDefaults.maxResultBytes,
  ),
  /** Where each run's result is stored until it expires. */
  REPORTS_RESULT_STORE: z
    .enum(ReportResultStoreKind)
    .default(ReportResultStoreKind.Row),
  /** Days a ready run's result is kept. */
  REPORTS_RESULT_TTL_DAYS: envNumber({ min: 1 }).default(
    ReportsDefaults.resultTtlDays,
  ),
});

export type ReportsConfig = z.output<typeof reportsConfigSchema>;
