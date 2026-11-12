import { InMemoryAsyncBloomFilter } from './async-bloom-filter.js';
import { BloomFilter } from './bloom-filter.js';
import { BloomFilterRegistry } from './bloom-filter-registry.js';
import { DuplicateFilter, UnknownFilter } from './bloom-error.js';

enum FilterName {
  BreachedPasswords = 'breached-passwords',
  RevokedTokens = 'revoked-tokens',
}

describe('BloomFilterRegistry', () => {
  it('returns the filter registered under a name', () => {
    const registry = new BloomFilterRegistry<FilterName>();
    const filter = BloomFilter.create({
      expectedItems: 10,
      falsePositiveRate: 0.01,
    });
    registry.register(FilterName.BreachedPasswords, filter);
    expect(registry.get(FilterName.BreachedPasswords)).toBe(filter);
  });

  it('holds async filters when parameterized with them', () => {
    const registry = new BloomFilterRegistry<
      FilterName,
      InMemoryAsyncBloomFilter
    >();
    const filter = new InMemoryAsyncBloomFilter(
      BloomFilter.create({ expectedItems: 10, falsePositiveRate: 0.01 }),
    );
    registry.register(FilterName.RevokedTokens, filter);
    expect(registry.get(FilterName.RevokedTokens)).toBe(filter);
  });

  it('throws UnknownFilter for names that were never registered', () => {
    const registry = new BloomFilterRegistry<FilterName>();
    expect(() => registry.get(FilterName.RevokedTokens)).toThrow(UnknownFilter);
  });

  it('throws DuplicateFilter when a name is registered twice', () => {
    const registry = new BloomFilterRegistry<FilterName>();
    registry.register(
      FilterName.BreachedPasswords,
      BloomFilter.create({ expectedItems: 10, falsePositiveRate: 0.01 }),
    );
    expect(() =>
      registry.register(
        FilterName.BreachedPasswords,
        BloomFilter.create({ expectedItems: 10, falsePositiveRate: 0.01 }),
      ),
    ).toThrow(DuplicateFilter);
  });
});
