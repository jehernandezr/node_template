import { defineEvent } from '@contracts/platform';
import { ReportsEvent } from '../enums/identifiers.enum.js';
import { RunCompletedPayloadSchema } from '../schemas/event.schema.js';

export const RunCompletedEvent = defineEvent({
  type: ReportsEvent.RunCompleted,
  payload: RunCompletedPayloadSchema,
  description:
    'A report run finished, ready or failed. Notifications tells whoever requested it.',
});
