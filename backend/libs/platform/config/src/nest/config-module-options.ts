import type { z } from 'zod';
import type { ConfigEnv } from '../config-env.js';

export interface ConfigModuleOptions {
  /** The service's own schema. Validated at startup and read with `AppConfig.root()`. */
  readonly schema?: z.ZodType;
  /** Environment to validate. Defaults to `process.env`. */
  readonly env?: ConfigEnv;
}
