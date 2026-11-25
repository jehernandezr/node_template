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
  .describe('Status of a task.') satisfies z.ZodType<TaskStatus>;

export const TaskFieldSchema = z
  .enum(TaskField)
  .describe(
    'Task field that a change can modify.',
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
  .describe('A task was created.') satisfies z.ZodType<TaskCreatedPayload>;

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
  .describe('A task was changed.') satisfies z.ZodType<TaskUpdatedPayload>;

export const TaskDeletedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    taskId: IdSchema,
    status: TaskStatusSchema,
    version: VersionSchema,
    actor: UserRefSchema,
    deletedAt: TimestampSchema,
  })
  .describe('A task was deleted.') satisfies z.ZodType<TaskDeletedPayload>;
