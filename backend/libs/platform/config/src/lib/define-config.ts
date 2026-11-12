import type { z } from 'zod';
import { ConfigValidationError, toConfigIssues } from './errors.js';

export type ConfigEnv = Record<string, string | undefined>;

export interface ConfigDefinition<TSchema extends z.ZodType> {
  /**
   * Validates the environment and returns the typed configuration.
   * Throws `ConfigValidationError` listing every invalid key. Call it once at startup.
   */
  load(env?: ConfigEnv): z.infer<TSchema>;
}

/** An empty variable (`LOG_LEVEL=`) counts as unset, so defaults apply. */
function normalizeEnv(env: ConfigEnv): ConfigEnv {
  const normalized: ConfigEnv = {};
  for (const [key, value] of Object.entries(env)) {
    normalized[key] = value === '' ? undefined : value;
  }
  return normalized;
}

export function defineConfig<TSchema extends z.ZodType>(
  schema: TSchema,
): ConfigDefinition<TSchema> {
  return {
    load(env: ConfigEnv = process.env): z.infer<TSchema> {
      const result = schema.safeParse(normalizeEnv(env));
      if (!result.success) {
        throw new ConfigValidationError(toConfigIssues(result.error));
      }
      return result.data as z.infer<TSchema>;
    },
  };
}
