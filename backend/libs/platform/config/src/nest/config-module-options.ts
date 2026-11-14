import type { z } from 'zod';
import type { ConfigEnv } from '../config-env.js';

export interface ConfigModuleOptions {
  /** Esquema propio del servicio. Se valida al arrancar y se lee con `AppConfig.root()`. */
  readonly schema?: z.ZodType;
  /** Entorno a validar. Por defecto `process.env`. */
  readonly env?: ConfigEnv;
}
