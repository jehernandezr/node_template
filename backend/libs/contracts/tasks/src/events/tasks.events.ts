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
  description: 'Se creó una tarea en un tenant.',
});

export const TaskUpdatedEvent = defineEvent({
  type: TasksEvent.TaskUpdated,
  payload: TaskUpdatedPayloadSchema,
  description:
    'Se cambió una tarea: campos modificados, estado anterior y nuevo, quien la cambió y quien la creó.',
});

export const TaskDeletedEvent = defineEvent({
  type: TasksEvent.TaskDeleted,
  payload: TaskDeletedPayloadSchema,
  description: 'Se borró una tarea (borrado lógico).',
});
