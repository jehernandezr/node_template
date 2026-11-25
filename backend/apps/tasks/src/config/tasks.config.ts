import { z } from 'zod';
import { envNumber, serviceConfigSchema } from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';
import { TasksDefaults } from '../shared/constants/tasks-defaults.constants.js';

/** tasks configuration. The libraries read their own (database, Valkey, auth, search) by their section. */
export const tasksConfigSchema = serviceConfigSchema.extend({
  ...internalHttpConfigSchema.shape,
  /** Days a deleted task stays in the database before the job removes it. */
  TASKS_DELETED_RETENTION_DAYS: envNumber({ min: 1 }).default(
    TasksDefaults.deletedRetentionDays,
  ),
});

export type TasksConfig = z.output<typeof tasksConfigSchema>;
