import { ConfigSection, envList, envNumber } from '@platform/config';
import { z } from 'zod';
import { LogLevel } from '../logging/log-level.enum.js';

export const loggingConfigSchema = z.object({
  LOG_LEVEL: z.enum(LogLevel).default(LogLevel.Info),
  /** Probabilidad (de 0 a 1) de que una petición loguee en debug. */
  LOG_SAMPLE_RATE: envNumber({ min: 0, max: 1 }).default(0),
  /** Módulos (`context` del logger) que loguean en debug sin importar el nivel. */
  LOG_DEBUG_CONTEXTS: envList().default([]),
});

export type LoggingSettings = z.infer<typeof loggingConfigSchema>;

export const LoggingConfig = new ConfigSection<LoggingSettings>(
  'logging',
  loggingConfigSchema,
);
