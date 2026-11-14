import { BloomDefinitionResolver } from '../bloom-definition-resolver.js';
import { BloomSizing } from '../bloom-sizing.js';
import { BloomErrorCode } from '../errors/bloom-error-code.enum.js';

const valid = {
  name: 'users.emails',
  expectedItems: 1_000,
  rebuildCron: '0 3 * * *',
};

describe('BloomDefinitionResolver', () => {
  it('applies the default false positive rate', () => {
    const resolved = BloomDefinitionResolver.resolve(valid);
    expect(resolved.falsePositiveRate).toBe(
      BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
    );
    expect(resolved.name).toBe('users.emails');
  });

  it('keeps a declared rate', () => {
    expect(
      BloomDefinitionResolver.resolve({ ...valid, falsePositiveRate: 0.001 })
        .falsePositiveRate,
    ).toBe(0.001);
  });

  it.each([
    ['an empty name', { ...valid, name: '' }],
    ['a zero size', { ...valid, expectedItems: 0 }],
    ['a rate out of range', { ...valid, falsePositiveRate: 2 }],
    ['a cron with four fields', { ...valid, rebuildCron: '0 3 * *' }],
    ['a cron with a bad character', { ...valid, rebuildCron: '0 3 * * $' }],
    ['an empty cron', { ...valid, rebuildCron: '' }],
  ])('rejects %s', (_label, definition) => {
    expect(() => BloomDefinitionResolver.resolve(definition)).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });

  it('accepts a six field cron with seconds', () => {
    expect(() =>
      BloomDefinitionResolver.resolve({ ...valid, rebuildCron: '0 0 3 * * *' }),
    ).not.toThrow();
  });
});
