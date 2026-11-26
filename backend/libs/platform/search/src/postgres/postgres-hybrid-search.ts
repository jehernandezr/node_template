import type { RepositoryKit } from '@platform/persistence';
import type { EmbeddingProvider } from '../embedding-provider.js';
import type { SearchLanguage } from '../search-language.enum.js';
import type { SearchQuery } from '../search-query.js';
import { SearchSchema } from '../search-schema.js';
import {
  PostgresSearchIndex,
  type RankingSql,
} from './postgres-search-index.js';

/**
 * Full text and semantic neighbors (pgvector cosine distance) combined by reciprocal rank
 * fusion: each list contributes `1 / (k + rank)`. That way a document that appears in both rises, and one
 * without the exact words but close in meaning also appears.
 */
export class PostgresHybridSearch extends PostgresSearchIndex {
  /** Fusion constant: high values flatten the difference between the top ranks. */
  private static readonly FUSION_K = 60;
  /** Candidates that each list contributes before fusing, beyond the requested page. */
  private static readonly CANDIDATES_PER_LIST = 200;

  constructor(
    kit: RepositoryKit,
    language: SearchLanguage,
    private readonly embeddings: EmbeddingProvider,
  ) {
    super(kit, language);
    if (embeddings.dimensions !== SearchSchema.EMBEDDING_DIMENSIONS) {
      throw new Error(
        `The embedding provider yields ${embeddings.dimensions} dimensions and search_documents stores ${SearchSchema.EMBEDDING_DIMENSIONS}`,
      );
    }
  }

  protected override async embeddingOf(text: string): Promise<string> {
    return PostgresHybridSearch.vectorLiteral(
      await this.embeddings.embed(text),
    );
  }

  protected override async rankingSql(query: SearchQuery): Promise<RankingSql> {
    const candidates = Math.max(
      PostgresHybridSearch.CANDIDATES_PER_LIST,
      query.offset + query.limit,
    );
    return {
      sql: `WITH lexical AS (SELECT "document_id", row_number() OVER (ORDER BY ts_rank_cd("search_vector", q) DESC, "document_id") AS position FROM "${SearchSchema.TABLE}", websearch_to_tsquery($3::regconfig, $4) q WHERE "tenant_id" = $1 AND "collection" = $2 AND "search_vector" @@ q ORDER BY position LIMIT $7), semantic AS (SELECT "document_id", row_number() OVER (ORDER BY "embedding" <=> $5::vector, "document_id") AS position FROM "${SearchSchema.TABLE}" WHERE "tenant_id" = $1 AND "collection" = $2 AND "embedding" IS NOT NULL ORDER BY "embedding" <=> $5::vector LIMIT $7) SELECT "document_id" AS id, COALESCE(1.0 / ($6 + lexical.position), 0) + COALESCE(1.0 / ($6 + semantic.position), 0) AS score FROM lexical FULL OUTER JOIN semantic USING ("document_id") ORDER BY score DESC, "document_id" LIMIT $8 OFFSET $9`,
      parameters: [
        query.collection,
        this.language,
        query.text,
        await this.embeddingOf(query.text),
        PostgresHybridSearch.FUSION_K,
        candidates,
        query.limit,
        query.offset,
      ],
    };
  }

  private static vectorLiteral(vector: readonly number[]): string {
    return `[${vector.join(',')}]`;
  }
}
