import type { Type } from '@nestjs/common';
import type { EmbeddingProvider } from '../embedding-provider.js';

export interface SearchModuleOptions {
  /** Necesario con `SEARCH_MODE=hybrid`; el modo de texto no lo usa. */
  readonly embeddings?: Type<EmbeddingProvider>;
}
