import { defineCommand } from '@contracts/platform';
import { ReportsCommand } from '../enums/identifiers.enum.js';
import { ExecuteRunPayloadSchema } from '../schemas/event.schema.js';

/** Reports se lo envía a sí mismo por el outbox para sacar el cálculo de la petición. */
export const ExecuteRunCommand = defineCommand({
  type: ReportsCommand.ExecuteRun,
  payload: ExecuteRunPayloadSchema,
  description: 'Ejecuta una ejecución de reporte en un worker.',
});
