import type { z } from 'zod';
import type { ConfigEnv } from './config-env.js';
import type { ConfigSection } from './config-section.js';
import { ConfigIssues } from './config-issues.js';
import { ConfigValidationError } from './errors/config-validation.error.js';

/**
 * Valida un entorno contra un esquema. Una variable vacía (`LOG_LEVEL=`) cuenta
 * como ausente, así aplican los valores por defecto. Falla listando todos los
 * problemas a la vez.
 */
export class ConfigLoader {
  private readonly env: ConfigEnv;

  constructor(env: ConfigEnv) {
    const normalized: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(env)) {
      normalized[key] = value === '' ? undefined : value;
    }
    this.env = normalized;
  }

  load<T>(schema: z.ZodType<T>): T {
    const result = schema.safeParse(this.env);
    if (!result.success) {
      throw new ConfigValidationError(ConfigIssues.fromZod(result.error));
    }
    return result.data;
  }

  loadSection<T>(section: ConfigSection<T>): T {
    return this.load(section.schema);
  }
}
