import type { Type } from '@nestjs/common';
import type { EmbeddingProvider } from '../embedding-provider.js';

export interface SearchModuleOptions {
  /** Required with `SEARCH_MODE=hybrid`; text mode does not use it. */
  readonly embeddings?: Type<EmbeddingProvider>;
}
