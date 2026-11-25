import type { ApiKeyEnvironment } from './api-key-environment.enum.js';

/** An API key split into its parts. */
export interface ParsedApiKey {
  readonly environment: ApiKeyEnvironment;
  /** Identifies the key without revealing it; it is the key of the `auth:apikey:{prefix}` cache. */
  readonly prefix: string;
  readonly secret: string;
}
