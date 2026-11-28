import { SystemClock } from '@platform/kernel';
import { InvalidParametersError } from '@platform/bloom';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { ValkeyBloomFilter } from '../valkey-bloom-filter.js';
import { ValkeyBloomFilterFactory } from '../valkey-bloom-filter-factory.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyCircuit } from '../valkey-circuit.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';
import { BloomKeys } from '../bloom-keys.js';
import { ScriptedValkeyRunner } from './utils/index.js';

const keyspace = new ValkeyKeyspace('svc');
const KEY = 'svc:bloom:{emails}';

function executorOver(runner: ScriptedValkeyRunner): ValkeyCommandExecutor {
  return new ValkeyCommandExecutor(
    runner,
    new ValkeyErrorTranslator(),
    new ValkeyCircuit(new SystemClock()),
  );
}

function filterOver(
  runner: ScriptedValkeyRunner,
  options: { nonScaling?: boolean } = {},
): ValkeyBloomFilter {
  return new ValkeyBloomFilter(executorOver(runner), {
    name: 'emails',
    expectedItems: 1_000,
    keyspace,
    ids: new SequentialIdGenerator(),
    ...options,
  });
}

describe('ValkeyBloomFilter', () => {
  it('creates the filter on the first insert with the declared shape', async () => {
    const runner = new ScriptedValkeyRunner([1, 1]);
    await filterOver(runner).addMany(['a', 'b']);
    expect(runner.calls).toEqual([
      ['BF.INSERT', [KEY, 'CAPACITY', 1_000, 'ERROR', 0.01, 'ITEMS', 'a', 'b']],
    ]);
  });

  it('declares a filter that refuses to grow', async () => {
    const runner = new ScriptedValkeyRunner([1]);
    await filterOver(runner, { nonScaling: true }).add('a');
    expect(runner.calls[0]?.[1]).toEqual([
      KEY,
      'CAPACITY',
      1_000,
      'ERROR',
      0.01,
      'NONSCALING',
      'ITEMS',
      'a',
    ]);
  });

  it('sends many items in batches', async () => {
    const runner = new ScriptedValkeyRunner([], []);
    const items = Array.from(
      { length: BloomKeys.BATCH_SIZE + 1 },
      (_, i) => `i${i}`,
    );
    await filterOver(runner).addMany(items);
    expect(runner.commands).toEqual(['BF.INSERT', 'BF.INSERT']);
  });

  it('asks whether an item may be there', async () => {
    const runner = new ScriptedValkeyRunner(1, 0);
    const filter = filterOver(runner);
    await expect(filter.mightContain('a')).resolves.toBe(true);
    await expect(filter.mightContain('b')).resolves.toBe(false);
    expect(runner.calls[0]).toEqual(['BF.EXISTS', [KEY, 'a']]);
  });

  it('refuses a reply that is not an integer', async () => {
    await expect(
      filterOver(new ScriptedValkeyRunner('yes')).mightContain('a'),
    ).rejects.toBeInstanceOf(ValkeyUnexpectedReplyError);
  });

  it('validates the name and the size when it is built', () => {
    const executor = executorOver(new ScriptedValkeyRunner());
    const build = (name: string, expectedItems: number, rate?: number) =>
      new ValkeyBloomFilter(executor, {
        name,
        expectedItems,
        falsePositiveRate: rate,
        keyspace,
        ids: new SequentialIdGenerator(),
      });
    expect(() => build('bad name', 10)).toThrow(InvalidParametersError);
    expect(() => build('ok', 0)).toThrow(InvalidParametersError);
    expect(() => build('ok', 10, 1.5)).toThrow(InvalidParametersError);
  });

  describe('rebuild', () => {
    const TEMPORARY = /^svc:bloom:\{emails\}:rebuild:.+$/;

    it('fills a temporary filter and swaps it in with one script', async () => {
      const runner = new ScriptedValkeyRunner('OK', 1, [1], [1], 1);
      async function* source(): AsyncIterable<readonly string[]> {
        yield ['a', 'b'];
        yield ['c'];
      }
      await filterOver(runner).rebuild(source());
      expect(runner.commands).toEqual([
        'BF.RESERVE',
        'PEXPIRE',
        'BF.INSERT',
        'BF.INSERT',
        'EVALSHA',
      ]);
      const temporary = String(runner.calls[0]?.[1][0]);
      expect(temporary).toMatch(TEMPORARY);
      expect(runner.calls[0]?.[1].slice(1)).toEqual([0.01, 1_000]);
      expect(runner.calls[1]?.[1]).toEqual([
        temporary,
        BloomKeys.REBUILD_KEY_TTL_MS,
      ]);
      expect(runner.calls[2]?.[1]).toEqual([
        temporary,
        'NOCREATE',
        'ITEMS',
        'a',
        'b',
      ]);
      expect(runner.calls[4]?.[1].slice(1)).toEqual([2, temporary, KEY]);
    });

    it('reserves a filter that refuses to grow when so declared', async () => {
      const runner = new ScriptedValkeyRunner('OK', 1, 1);
      await filterOver(runner, { nonScaling: true }).rebuild([]);
      expect(runner.calls[0]?.[1]).toEqual([
        expect.stringMatching(TEMPORARY),
        0.01,
        1_000,
        'NONSCALING',
      ]);
    });

    it('drops the temporary key and rethrows when the source fails', async () => {
      const runner = new ScriptedValkeyRunner('OK', 1, 1);
      async function* failing(): AsyncIterable<readonly string[]> {
        yield* [];
        throw new Error('source down');
      }
      await expect(filterOver(runner).rebuild(failing())).rejects.toThrow(
        'source down',
      );
      expect(runner.commands).toEqual(['BF.RESERVE', 'PEXPIRE', 'DEL']);
    });

    it('still reports the original failure when the cleanup fails too', async () => {
      const runner = new ScriptedValkeyRunner(
        new Error('Connection is closed.'),
        new Error('Connection is closed.'),
      );
      await expect(filterOver(runner).rebuild([])).rejects.toMatchObject({
        command: 'BF.RESERVE',
      });
      expect(runner.commands).toEqual(['BF.RESERVE', 'DEL']);
    });
  });
});

describe('ValkeyBloomFilterFactory', () => {
  it('builds the filter of a definition in the keyspace of the service', async () => {
    const runner = new ScriptedValkeyRunner([1]);
    const factory = new ValkeyBloomFilterFactory(
      executorOver(runner),
      keyspace,
      new SequentialIdGenerator(),
    );
    const filter = factory.create({
      name: 'emails',
      expectedItems: 500,
      falsePositiveRate: 0.001,
      rebuildCron: '0 3 * * *',
    });
    await filter.add('a');
    expect(runner.calls[0]?.[1]).toEqual([
      KEY,
      'CAPACITY',
      500,
      'ERROR',
      0.001,
      'ITEMS',
      'a',
    ]);
  });
});
