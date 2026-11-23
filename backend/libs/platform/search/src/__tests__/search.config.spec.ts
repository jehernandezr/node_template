import { SearchLanguage } from '../search-language.enum.js';
import { SearchMode } from '../search-mode.enum.js';
import { searchConfigSchema } from '../search.config.js';

describe('searchConfigSchema', () => {
  it('defaults to text search in Spanish', () => {
    expect(searchConfigSchema.parse({})).toEqual({
      SEARCH_MODE: SearchMode.Text,
      SEARCH_LANGUAGE: SearchLanguage.Spanish,
    });
  });

  it('rejects an unknown mode', () => {
    expect(
      searchConfigSchema.safeParse({ SEARCH_MODE: 'vector' }).success,
    ).toBe(false);
  });
});
