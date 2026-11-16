import { defineCommand } from '@contracts/platform';
import { BillingCommand } from '../enums/identifiers.enum.js';
import { RecordUsagePayloadSchema } from '../schemas/event.schema.js';

/**
 * Lote de registros de uso. Lo envían los servicios que miden; es un comando y
 * no un evento porque solo el dueño de un evento puede publicarlo.
 */
export const RecordUsageCommand = defineCommand({
  type: BillingCommand.RecordUsage,
  payload: RecordUsagePayloadSchema,
  description:
    'Registra el uso de un tenant medido por otro servicio. Cada registro lleva su llave de idempotencia.',
});
