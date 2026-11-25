import { SearchLanguage } from './search-language.enum.js';

/**
 * `search_documents` table shared by both index modes. The vector is stored even when the mode is
 * text: changing `SEARCH_MODE` does not require another migration, only reindexing. The table has RLS per
 * tenant like any tenant table; the service migrations enable it with `TenantIsolationSql`.
 * It needs the `vector` extension in the database: whoever provisions the database creates it, because the service role
 * cannot create extensions.
 */
export class SearchSchema {
  static readonly TABLE = 'search_documents';
  /** Dimensions of the vectors the table stores; the `EmbeddingProvider` must produce the same. */
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

  /** The name goes inside the SQL of the generated column, so only an enum value is accepted. */
  private static config(language: SearchLanguage): SearchLanguage {
    if (!Object.values(SearchLanguage).includes(language)) {
      throw new Error(`Unsupported search language: ${String(language)}`);
    }
    return language;
  }
}
