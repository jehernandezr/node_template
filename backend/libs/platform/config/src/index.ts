import { ConfigLoader } from './config-loader.js';
import type { ConfigEnv } from './config-env.js';
import type { z } from 'zod';

export * from './app-config.js';
export * from './config-env.js';
export * from './config-issue.js';
export * from './config-issues.js';
export * from './config-loader.js';
export * from './config-registry.js';
export * from './config-section.js';
export * from './registry-app-config.js';
export * from './enums/deploy-environment.enum.js';
export * from './enums/node-env.enum.js';
export * from './env.js';
export * from './errors/config-error-catalog.js';
export * from './errors/config-error-code.enum.js';
export * from './errors/config-validation.error.js';
export * from './sections/service.config.js';
export * from './secret.js';

/**
 * @deprecated Usa `ConfigLoader` o una `ConfigSection` con `AppConfig`.
 */
export function defineConfig<TSchema extends z.ZodType>(
  schema: TSchema,
): { load(env?: ConfigEnv): z.infer<TSchema> } {
  return {
    load: (env: ConfigEnv = process.env) =>
      new ConfigLoader(env).load(schema) as z.infer<TSchema>,
  };
}
