import { z } from 'zod';
import { IdSchema, TimestampSchema, UserRefSchema } from '@contracts/platform';
import { TasksLimits } from '../constants/tasks.constants.js';
import { TaskField, TaskStatus } from '../enums/tasks.enum.js';
import type {
  TaskCreatedPayload,
  TaskDeletedPayload,
  TaskUpdatedPayload,
} from '../types/event.type.js';

export const TaskStatusSchema = z
  .enum(TaskStatus)
  .describe('Estado de una tarea.') satisfies z.ZodType<TaskStatus>;

export const TaskFieldSchema = z
  .enum(TaskField)
  .describe(
    'Campo de una tarea que un cambio puede modificar.',
  ) satisfies z.ZodType<TaskField>;

const VersionSchema = z.int().min(1);

export const TaskCreatedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    taskId: IdSchema,
    status: TaskStatusSchema,
    version: VersionSchema,
    createdBy: UserRefSchema,
    createdAt: TimestampSchema,
  })
  .describe('Se creó una tarea.') satisfies z.ZodType<TaskCreatedPayload>;

export const TaskUpdatedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    taskId: IdSchema,
    changedFields: z.array(TaskFieldSchema).max(TasksLimits.maxChangedFields),
    statusBefore: TaskStatusSchema,
    statusAfter: TaskStatusSchema,
    version: VersionSchema,
    actor: UserRefSchema,
    createdBy: UserRefSchema,
    updatedAt: TimestampSchema,
  })
  .describe('Se cambió una tarea.') satisfies z.ZodType<TaskUpdatedPayload>;

export const TaskDeletedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    taskId: IdSchema,
    status: TaskStatusSchema,
    version: VersionSchema,
    actor: UserRefSchema,
    deletedAt: TimestampSchema,
  })
  .describe('Se borró una tarea.') satisfies z.ZodType<TaskDeletedPayload>;
