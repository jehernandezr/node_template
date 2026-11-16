import type { DatabaseSetDefinition } from './database-set-definition.js';
import type { DatabaseEndpoint } from './database-endpoint.js';

/** Datos para generar una migración comparando las entidades con una base temporal. */
export interface MigrationGenerateRequest {
  /** Nombre en PascalCase, sin el timestamp. */
  readonly name: string;
  /** Carpeta donde se escribe el archivo (`migrations/shard` o `migrations/catalog` del servicio). */
  readonly outputDir: string;
  /** Entidades actuales y las migraciones ya existentes, para dejar la base temporal en el estado anterior. */
  readonly definition: DatabaseSetDefinition;
  /** Servidor PostgreSQL donde se crea y se borra la base temporal. */
  readonly server: DatabaseEndpoint;
  readonly user: string;
  readonly password: string;
}
