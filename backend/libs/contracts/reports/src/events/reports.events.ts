import { defineEvent } from '@contracts/platform';
import { ReportsEvent } from '../enums/identifiers.enum.js';
import { RunCompletedPayloadSchema } from '../schemas/event.schema.js';

export const RunCompletedEvent = defineEvent({
  type: ReportsEvent.RunCompleted,
  payload: RunCompletedPayloadSchema,
  description:
    'Terminó una ejecución de reporte, lista o fallida. Notifications avisa a quien la pidió.',
});
