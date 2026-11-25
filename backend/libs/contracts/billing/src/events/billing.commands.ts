import { defineCommand } from '@contracts/platform';
import { BillingCommand } from '../enums/identifiers.enum.js';
import { RecordUsagePayloadSchema } from '../schemas/event.schema.js';

/**
 * Batch of usage records. Sent by the services that meter; it is a command and
 * not an event because only the owner of an event can publish it.
 */
export const RecordUsageCommand = defineCommand({
  type: BillingCommand.RecordUsage,
  payload: RecordUsagePayloadSchema,
  description:
    'Records the usage of a tenant metered by another service. Each record carries its idempotency key.',
});
