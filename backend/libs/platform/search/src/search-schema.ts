import { SearchLanguage } from './search-language.enum.js';

/**
 * Tabla `search_documents` que comparten los dos modos del índice. El vector se guarda aunque el modo sea
 * de texto: cambiar `SEARCH_MODE` no exige otra migración, solo volver a indexar. La tabla tiene RLS por
 * tenant como cualquier tabla de tenant; las migraciones del servicio la activan con `TenantIsolationSql`.
 * Necesita la extensión `vector` en la base: la crea quien provisiona la base, porque el rol del servicio no
 * puede crear extensiones.
 */
export class SearchSchema {
  static readonly TABLE = 'search_documents';
  /** Dimensiones de los vectores que guarda la tabla; el `EmbeddingProvider` debe producir las mismas. */
  static readonly EMBEDDING_DIMENSIONS = 256;

  static create(language: SearchLanguage = SearchLanguage.Spanish): string[] {
    const config = SearchSchema.config(language);
    return [
      `CREATE TABLE "${SearchSchema.TABLE}" ("tenant_id" uuid NOT NULL, "collection" character varying(64) NOT NULL, "document_id" uuid NOT NULL, "content" text NOT NULL, "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('${config}', "content")) STORED, "embedding" vector(${SearchSchema.EMBEDDING_DIMENSIONS}), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "search_documents_pkey" PRIMARY KEY ("tenant_id", "collection", "document_id"))`,
      `CREATE INDEX "search_documents_vector_idx" ON "${SearchSchema.TABLE}" USING GIN ("search_vector")`,
      `CREATE INDEX "search_documents_embedding_idx" ON "${SearchSchema.TABLE}" USING hnsw ("embedding" vector_cosine_ops)`,
    ];
  }

  static drop(): string[] {
    return [`DROP TABLE "${SearchSchema.TABLE}"`];
  }

  /** El nombre va dentro del SQL de la columna generada, así que solo se acepta un valor del enum. */
  private static config(language: SearchLanguage): SearchLanguage {
    if (!Object.values(SearchLanguage).includes(language)) {
      throw new Error(`Unsupported search language: ${String(language)}`);
    }
    return language;
  }
}
