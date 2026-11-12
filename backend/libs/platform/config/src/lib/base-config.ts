import { z } from 'zod';
import { envList, envNumber } from './env.js';

export enum ConfigLogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/** Variables every service shares. Services extend it with `.extend({...})`. */
export const baseConfigSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.Development),
  SERVICE_NAME: z.string().trim().min(1),
  LOG_LEVEL: z.enum(ConfigLogLevel).default(ConfigLogLevel.Info),
  LOG_SAMPLE_RATE: envNumber({ min: 0, max: 1 }).default(0),
  LOG_DEBUG_CONTEXTS: envList().default([]),
  AWS_REGION: z.string().trim().min(1).optional(),
  DB_SLOW_QUERY_MS: envNumber({ min: 0 }).default(500),
});
