import type { ApiKeyEnvironment } from './api-key-environment.enum.js';

/** Una API key separada en sus partes. */
export interface ParsedApiKey {
  readonly environment: ApiKeyEnvironment;
  /** Identifica la key sin revelarla; es la llave de la caché `auth:apikey:{prefix}`. */
  readonly prefix: string;
  readonly secret: string;
}
