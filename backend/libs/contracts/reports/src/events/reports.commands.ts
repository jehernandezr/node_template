import { defineCommand } from '@contracts/platform';
import { ReportsCommand } from '../enums/identifiers.enum.js';
import { ExecuteRunPayloadSchema } from '../schemas/event.schema.js';

/** Reports sends it to itself through the outbox to move the computation out of the request. */
export const ExecuteRunCommand = defineCommand({
  type: ReportsCommand.ExecuteRun,
  payload: ExecuteRunPayloadSchema,
  description: 'Executes a report run in a worker.',
});
