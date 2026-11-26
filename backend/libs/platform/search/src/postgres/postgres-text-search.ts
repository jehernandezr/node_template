import type { RepositoryKit } from '@platform/persistence';
import type { SearchLanguage } from '../search-language.enum.js';
import type { SearchQuery } from '../search-query.js';
import { SearchSchema } from '../search-schema.js';
import {
  PostgresSearchIndex,
  type RankingSql,
} from './postgres-search-index.js';

/**
 * Full-text search with `websearch_to_tsquery`: accepts quoted phrases, `or` and `-word`.
 * Only returns documents that contain the terms, ordered by `ts_rank_cd`.
 */
export class PostgresTextSearch extends PostgresSearchIndex {
  constructor(kit: RepositoryKit, language: SearchLanguage) {
    super(kit, language);
  }

  protected override async embeddingOf(): Promise<null> {
    return null;
  }

  protected override async rankingSql(query: SearchQuery): Promise<RankingSql> {
    return {
      sql: `SELECT "document_id" AS id, ts_rank_cd("search_vector", q) AS score FROM "${SearchSchema.TABLE}", websearch_to_tsquery($3::regconfig, $4) q WHERE "tenant_id" = $1 AND "collection" = $2 AND "search_vector" @@ q ORDER BY score DESC, "document_id" LIMIT $5 OFFSET $6`,
      parameters: [
        query.collection,
        this.language,
        query.text,
        query.limit,
        query.offset,
      ],
    };
  }
}
