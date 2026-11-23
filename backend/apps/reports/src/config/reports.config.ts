import { z } from 'zod';
import { envNumber, serviceConfigSchema } from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';
import { ReportsDefaults } from '../shared/constants/reports-defaults.constants.js';
import { ReportResultStoreKind } from '../shared/enums/report-result-store-kind.enum.js';

/** Configuración de reports. */
export const reportsConfigSchema = serviceConfigSchema.extend({
  ...internalHttpConfigSchema.shape,
  /** Tamaño máximo del resultado de una ejecución, en bytes de su JSON. */
  REPORTS_MAX_RESULT_BYTES: envNumber({ min: 1024 }).default(
    ReportsDefaults.maxResultBytes,
  ),
  /** Dónde se guarda el resultado de cada ejecución hasta que vence. */
  REPORTS_RESULT_STORE: z
    .enum(ReportResultStoreKind)
    .default(ReportResultStoreKind.Row),
  /** Días que se guarda el resultado de una ejecución lista. */
  REPORTS_RESULT_TTL_DAYS: envNumber({ min: 1 }).default(
    ReportsDefaults.resultTtlDays,
  ),
});

export type ReportsConfig = z.output<typeof reportsConfigSchema>;
