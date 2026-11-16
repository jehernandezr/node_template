import { Compensation, defineOperation } from '@contracts/platform';
import { ReportsOperation } from '../enums/identifiers.enum.js';
import {
  EraseReportsUserInputSchema,
  EraseReportsUserResultSchema,
} from '../schemas/report.schema.js';

/**
 * Borra al solicitante de las ejecuciones y proyecciones de reports. Corre después
 * del pivote de la saga: se repite hasta terminar y no se revierte.
 */
export const EraseReportsUserDataOperation = defineOperation({
  id: ReportsOperation.EraseUserData,
  input: EraseReportsUserInputSchema,
  output: EraseReportsUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Borrar al solicitante es irreversible y corre después del pivote de la saga: se repite hasta terminar y no se revierte.',
  timeoutMs: 6_000,
  description:
    'Borra los datos del usuario en las ejecuciones y las proyecciones.',
});
