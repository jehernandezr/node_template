import { InvalidParametersError } from '@platform/bloom';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { BloomKeys } from '../bloom-keys.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';

const keyspace = new ValkeyKeyspace('svc');

describe('BloomKeys', () => {
  it('puts the name in a hash tag under the prefix', () => {
    expect(BloomKeys.filter(keyspace, 'users.emails')).toBe(
      'svc:bloom:{users.emails}',
    );
  });

  it.each([[''], ['has space'], ['x'.repeat(129)]])(
    'rejects the name %p',
    (name) => {
      expect(() => BloomKeys.filter(keyspace, name)).toThrow(
        InvalidParametersError,
      );
    },
  );

  it('keeps the rebuild key in the slot of the live key', () => {
    const live = BloomKeys.filter(keyspace, 'emails');
    const rebuild = BloomKeys.rebuild(live, new SequentialIdGenerator());
    expect(rebuild.startsWith(`${live}:rebuild:`)).toBe(true);
    expect(rebuild.match(/\{[^}]+\}/)?.[0]).toBe('{emails}');
  });

  it('splits items into batches of the given size', () => {
    expect([...BloomKeys.batches([1, 2, 3, 4, 5], 2)]).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ]);
    expect([...BloomKeys.batches([])]).toEqual([]);
  });
});
