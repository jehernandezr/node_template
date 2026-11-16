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
  .describe('Una tarea de la organización.') satisfies z.ZodType<Task>;

export const TaskPageSchema = pageOf(
  TaskSchema,
  'Página de tareas del tenant.',
) satisfies z.ZodType<TaskPage>;

export const ListTasksRequestSchema = z
  .strictObject({
    status: TaskStatusSchema.optional(),
    q: z.string().min(1).max(TasksLimits.searchQueryMax).optional(),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Listado o búsqueda de tareas, con filtro de estado opcional.',
  ) satisfies z.ZodType<ListTasksRequest>;

export const GetTaskRequestSchema = z
  .strictObject({ taskId: IdSchema })
  .describe('Tarea a consultar.') satisfies z.ZodType<GetTaskRequest>;

export const CreateTaskRequestSchema = z
  .strictObject({
    title: TitleSchema,
    description: DescriptionSchema.optional(),
  })
  .describe('Alta de una tarea.') satisfies z.ZodType<CreateTaskRequest>;

export const UpdateTaskRequestSchema = z
  .strictObject({
    taskId: IdSchema,
    title: TitleSchema.optional(),
    description: DescriptionSchema.optional(),
    status: TaskStatusSchema.optional(),
    expectedVersion: VersionSchema.optional(),
  })
  .describe(
    'Cambios parciales de una tarea, con versión esperada opcional.',
  ) satisfies z.ZodType<UpdateTaskRequest>;

export const DeleteTaskRequestSchema = z
  .strictObject({ taskId: IdSchema })
  .describe('Tarea a borrar.') satisfies z.ZodType<DeleteTaskRequest>;

export const TaskChangeSchema = TaskSchema.extend({
  deletedAt: TimestampSchema.nullable(),
}).describe(
  'Tarea con la fecha de borrado lógico, si la hubo.',
) satisfies z.ZodType<TaskChange>;

export const TaskChangePageSchema = pageOf(
  TaskChangeSchema,
  'Página de cambios de tareas.',
) satisfies z.ZodType<TaskChangePage>;

export const ListTaskChangesInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    updatedAfter: TimestampSchema.optional(),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Entrada para paginar los cambios de tareas de un tenant.',
  ) satisfies z.ZodType<ListTaskChangesInput>;

export const EraseTasksUserInputSchema = z
  .strictObject({ user: UserRefSchema })
  .describe(
    'Usuario cuyos datos se anonimizan en las tareas.',
  ) satisfies z.ZodType<EraseTasksUserInput>;

export const EraseTasksUserResultSchema = z
  .object({ userId: IdSchema, affectedRows: z.int().min(0) })
  .describe(
    'Filas de tareas anonimizadas para un usuario.',
  ) satisfies z.ZodType<EraseTasksUserResult>;
