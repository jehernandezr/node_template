import { z } from 'zod';
import {
  CursorSchema,
  IdSchema,
  PageLimitSchema,
  pageOf,
  TimestampSchema,
  UserRefSchema,
} from '@contracts/platform';
import { TasksLimits } from '../constants/tasks.constants.js';
import { TaskStatusSchema } from './event.schema.js';
import type {
  CreateTaskRequest,
  DeleteTaskRequest,
  EraseTasksUserInput,
  EraseTasksUserResult,
  GetTaskRequest,
  ListTaskChangesInput,
  ListTasksRequest,
  Task,
  TaskChange,
  TaskChangePage,
  TaskPage,
  UpdateTaskRequest,
} from '../types/task.type.js';

const TitleSchema = z.string().min(1).max(TasksLimits.titleMax);

const DescriptionSchema = z.string().max(TasksLimits.descriptionMax);

const VersionSchema = z.int().min(1);

export const TaskSchema = z
  .object({
    id: IdSchema,
    title: TitleSchema,
    description: DescriptionSchema,
    status: TaskStatusSchema,
    version: VersionSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    createdBy: UserRefSchema,
  })
  .describe('A task of the organization.') satisfies z.ZodType<Task>;

export const TaskPageSchema = pageOf(
  TaskSchema,
  'Page of tenant tasks.',
) satisfies z.ZodType<TaskPage>;

export const ListTasksRequestSchema = z
  .strictObject({
    status: TaskStatusSchema.optional(),
    q: z.string().min(1).max(TasksLimits.searchQueryMax).optional(),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Listing or search of tasks, with an optional status filter.',
  ) satisfies z.ZodType<ListTasksRequest>;

export const GetTaskRequestSchema = z
  .strictObject({ taskId: IdSchema })
  .describe('Task to query.') satisfies z.ZodType<GetTaskRequest>;

export const CreateTaskRequestSchema = z
  .strictObject({
    title: TitleSchema,
    description: DescriptionSchema.optional(),
  })
  .describe('Task creation.') satisfies z.ZodType<CreateTaskRequest>;

export const UpdateTaskRequestSchema = z
  .strictObject({
    taskId: IdSchema,
    title: TitleSchema.optional(),
    description: DescriptionSchema.optional(),
    status: TaskStatusSchema.optional(),
    expectedVersion: VersionSchema.optional(),
  })
  .describe(
    'Partial changes of a task, with an optional expected version.',
  ) satisfies z.ZodType<UpdateTaskRequest>;

export const DeleteTaskRequestSchema = z
  .strictObject({ taskId: IdSchema })
  .describe('Task to delete.') satisfies z.ZodType<DeleteTaskRequest>;

export const TaskChangeSchema = TaskSchema.extend({
  deletedAt: TimestampSchema.nullable(),
}).describe(
  'Task with the soft delete date, if any.',
) satisfies z.ZodType<TaskChange>;

export const TaskChangePageSchema = pageOf(
  TaskChangeSchema,
  'Page of task changes.',
) satisfies z.ZodType<TaskChangePage>;

export const ListTaskChangesInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    updatedAfter: TimestampSchema.optional(),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Input to page the task changes of a tenant.',
  ) satisfies z.ZodType<ListTaskChangesInput>;

export const EraseTasksUserInputSchema = z
  .strictObject({ user: UserRefSchema })
  .describe(
    'User whose data is anonymized in the tasks.',
  ) satisfies z.ZodType<EraseTasksUserInput>;

export const EraseTasksUserResultSchema = z
  .object({ userId: IdSchema, affectedRows: z.int().min(0) })
  .describe(
    'Task rows anonymized for a user.',
  ) satisfies z.ZodType<EraseTasksUserResult>;
