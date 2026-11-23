import { SearchLanguage } from '../search-language.enum.js';
import { SearchSchema } from '../search-schema.js';

describe('SearchSchema', () => {
  it('generates the text vector with the requested language', () => {
    const [table] = SearchSchema.create(SearchLanguage.English);

    expect(table).toContain(`to_tsvector('english', "content")`);
    expect(table).toContain(`vector(${SearchSchema.EMBEDDING_DIMENSIONS})`);
  });

  it('refuses a language outside the enum, because it ends up inside the SQL', () => {
    expect(() =>
      SearchSchema.create("spanish'); DROP TABLE x; --" as SearchLanguage),
    ).toThrow(/Unsupported search language/);
  });
});
