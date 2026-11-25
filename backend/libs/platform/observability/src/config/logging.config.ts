import { ConfigSection, envList, envNumber } from '@platform/config';
import { z } from 'zod';
import { LogLevel } from '../logging/log-level.enum.js';

export const loggingConfigSchema = z.object({
  LOG_LEVEL: z.enum(LogLevel).default(LogLevel.Info),
  /** Probability (from 0 to 1) that a request logs at debug level. */
  LOG_SAMPLE_RATE: envNumber({ min: 0, max: 1 }).default(0),
  /** Modules (logger `context`) that log at debug regardless of the level. */
  LOG_DEBUG_CONTEXTS: envList().default([]),
});

export type LoggingSettings = z.infer<typeof loggingConfigSchema>;

export const LoggingConfig = new ConfigSection<LoggingSettings>(
  'logging',
  loggingConfigSchema,
);
