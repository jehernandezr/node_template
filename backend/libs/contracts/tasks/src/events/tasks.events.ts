import { defineEvent } from '@contracts/platform';
import { TasksEvent } from '../enums/identifiers.enum.js';
import {
  TaskCreatedPayloadSchema,
  TaskDeletedPayloadSchema,
  TaskUpdatedPayloadSchema,
} from '../schemas/event.schema.js';

export const TaskCreatedEvent = defineEvent({
  type: TasksEvent.TaskCreated,
  payload: TaskCreatedPayloadSchema,
  description: 'A task was created in a tenant.',
});

export const TaskUpdatedEvent = defineEvent({
  type: TasksEvent.TaskUpdated,
  payload: TaskUpdatedPayloadSchema,
  description:
    'A task was changed: modified fields, previous and new status, who changed it and who created it.',
});

export const TaskDeletedEvent = defineEvent({
  type: TasksEvent.TaskDeleted,
  payload: TaskDeletedPayloadSchema,
  description: 'A task was deleted (soft delete).',
});
