import { ConfigSection } from '@platform/config';
import { z } from 'zod';
import { SearchLanguage } from './search-language.enum.js';
import { SearchMode } from './search-mode.enum.js';

/** `SEARCH_LANGUAGE` debe ser el mismo con que la migración creó `search_documents`. */
export const searchConfigSchema = z.object({
  SEARCH_MODE: z.enum(SearchMode).default(SearchMode.Text),
  SEARCH_LANGUAGE: z.enum(SearchLanguage).default(SearchLanguage.Spanish),
});

export type SearchSettings = z.output<typeof searchConfigSchema>;

export const SearchConfig = new ConfigSection<SearchSettings>(
  'search',
  searchConfigSchema,
);
