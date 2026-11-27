import { SystemClock } from '@platform/kernel';
import { ValkeyCache } from '../valkey-cache.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyCircuit } from '../valkey-circuit.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';
import { ScriptedValkeyRunner } from './utils/index.js';

const keyspace = new ValkeyKeyspace('svc');

function cacheOver(runner: ScriptedValkeyRunner): ValkeyCache {
  return new ValkeyCache(
    new ValkeyCommandExecutor(
      runner,
      new ValkeyErrorTranslator(),
      new ValkeyCircuit(new SystemClock()),
    ),
    keyspace,
  );
}

describe('ValkeyCache commands', () => {
  it('maps the port to atomic commands with the key prefix', async () => {
    const runner = new ScriptedValkeyRunner(null, 'OK', 'OK', null, 1, 1);
    const cache = cacheOver(runner);

    await expect(cache.get('a')).resolves.toBeUndefined();
    await cache.set('a', 'v');
    await cache.set('a', 'v', 1_499.2);
    await expect(cache.setIfAbsent('a', 'v')).resolves.toBe(false);
    await cache.delete('a');
    await cache.set('a', 'v', 0);

    expect(runner.calls).toEqual([
      ['GET', ['svc:a']],
      ['SET', ['svc:a', 'v']],
      ['SET', ['svc:a', 'v', 'PX', 1_500]],
      ['SET', ['svc:a', 'v', 'NX']],
      ['DEL', ['svc:a']],
      ['DEL', ['svc:a']],
    ]);
  });

  it('reports a set when the key was absent', async () => {
    await expect(
      cacheOver(new ScriptedValkeyRunner('OK')).setIfAbsent('a', 'v'),
    ).resolves.toBe(true);
  });

  it.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'rejects the TTL %p before calling',
    async (ttl) => {
      const runner = new ScriptedValkeyRunner();
      await expect(cacheOver(runner).set('a', 'v', ttl)).rejects.toMatchObject({
        code: 'PLATFORM.CACHE.INVALID_ARGUMENT',
      });
      expect(runner.calls).toHaveLength(0);
    },
  );

  it('refuses a reply of the wrong shape', async () => {
    await expect(
      cacheOver(new ScriptedValkeyRunner(42)).get('a'),
    ).rejects.toBeInstanceOf(ValkeyUnexpectedReplyError);
  });
});
