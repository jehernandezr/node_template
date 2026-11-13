import { InMemoryAsyncBloomFilter } from './async-bloom-filter.js';
import { BloomFilter } from './bloom-filter.js';
import { BloomFilterRegistry } from './bloom-filter-registry.js';
import {
  DuplicateFilter,
  InvalidParameters,
  UnknownFilter,
} from './bloom-error.js';
import type { BloomFilterDefinition } from './bloom-filter-definition.js';

enum FilterName {
  BreachedPasswords = 'breached-passwords',
  RevokedTokens = 'revoked-tokens',
}

const breached: BloomFilterDefinition<FilterName> = {
  name: FilterName.BreachedPasswords,
  expectedItems: 10,
  rebuildCron: '0 3 * * 0',
};

const revoked: BloomFilterDefinition<FilterName> = {
  name: FilterName.RevokedTokens,
  expectedItems: 10,
  falsePositiveRate: 0.001,
  rebuildCron: '*/15 * * * *',
};

describe('BloomFilterRegistry', () => {
  it('returns the filter registered under a name', () => {
    const registry = new BloomFilterRegistry<FilterName>();
    const filter = BloomFilter.create({ expectedItems: 10 });
    registry.register(breached, filter);
    expect(registry.get(FilterName.BreachedPasswords)).toBe(filter);
  });

  it('holds async filters when parameterized with them', () => {
    const registry = new BloomFilterRegistry<
      FilterName,
      InMemoryAsyncBloomFilter
    >();
    const filter = new InMemoryAsyncBloomFilter(
      BloomFilter.create({ expectedItems: 10 }),
    );
    registry.register(revoked, filter);
    expect(registry.get(FilterName.RevokedTokens)).toBe(filter);
  });

  it('keeps each declaration with the 1 % default applied', () => {
    const registry = new BloomFilterRegistry<FilterName>();
    registry.register(breached, BloomFilter.create({ expectedItems: 10 }));
    registry.register(revoked, BloomFilter.create({ expectedItems: 10 }));

    expect(registry.definition(FilterName.BreachedPasswords)).toEqual({
      ...breached,
      falsePositiveRate: 0.01,
    });
    expect(registry.definitions().map((d) => d.rebuildCron)).toEqual([
      '0 3 * * 0',
      '*/15 * * * *',
    ]);
  });

  it.each([
    [{ ...breached, rebuildCron: '' }],
    [{ ...breached, rebuildCron: 'every day' }],
    [{ ...breached, rebuildCron: '0 3 * * 0 * 1' }],
    [{ ...breached, expectedItems: 0 }],
    [{ ...breached, falsePositiveRate: 1 }],
    [{ ...breached, name: '' as FilterName }],
  ])('rejects the invalid definition %p', (definition) => {
    const registry = new BloomFilterRegistry<FilterName>();
    expect(() =>
      registry.register(definition, BloomFilter.create({ expectedItems: 10 })),
    ).toThrow(InvalidParameters);
  });

  it('throws UnknownFilter for names that were never registered', () => {
    const registry = new BloomFilterRegistry<FilterName>();
    expect(() => registry.get(FilterName.RevokedTokens)).toThrow(UnknownFilter);
    expect(() => registry.definition(FilterName.RevokedTokens)).toThrow(
      UnknownFilter,
    );
  });

  it('throws DuplicateFilter when a name is registered twice', () => {
    const registry = new BloomFilterRegistry<FilterName>();
    registry.register(breached, BloomFilter.create({ expectedItems: 10 }));
    expect(() =>
      registry.register(breached, BloomFilter.create({ expectedItems: 10 })),
    ).toThrow(DuplicateFilter);
  });
});
