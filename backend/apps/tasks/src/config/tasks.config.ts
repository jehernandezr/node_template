import { z } from 'zod';
import { envNumber, serviceConfigSchema } from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';
import { TasksDefaults } from '../shared/constants/tasks-defaults.constants.js';

/** Configuración de tasks. Las librerías leen las suyas (base de datos, Valkey, auth, búsqueda) por su sección. */
export const tasksConfigSchema = serviceConfigSchema.extend({
  ...internalHttpConfigSchema.shape,
  /** Días que una tarea borrada sigue en la base antes de que el job la elimine. */
  TASKS_DELETED_RETENTION_DAYS: envNumber({ min: 1 }).default(
    TasksDefaults.deletedRetentionDays,
  ),
});

export type TasksConfig = z.output<typeof tasksConfigSchema>;
