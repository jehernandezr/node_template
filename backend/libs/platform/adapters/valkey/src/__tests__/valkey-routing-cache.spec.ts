import { SystemClock } from '@platform/kernel';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyCircuit } from '../valkey-circuit.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyRoutingCache } from '../valkey-routing-cache.js';
import { ReplyErrors, ScriptedValkeyRunner } from './utils/index.js';

function cacheOver(runner: ScriptedValkeyRunner): ValkeyRoutingCache {
  return new ValkeyRoutingCache(
    new ValkeyCommandExecutor(
      runner,
      new ValkeyErrorTranslator(),
      new ValkeyCircuit(new SystemClock()),
    ),
    new ValkeyKeyspace('svc'),
  );
}

describe('ValkeyRoutingCache commands', () => {
  it('reads the value field of the entry under the routing prefix', async () => {
    const runner = new ScriptedValkeyRunner('v');
    await expect(cacheOver(runner).get('k')).resolves.toBe('v');
    expect(runner.calls).toEqual([['HGET', ['svc:routing:k', 'val']]]);
  });

  it('writes through one script with the rounded TTL', async () => {
    const runner = new ScriptedValkeyRunner(1, 0);
    const cache = cacheOver(runner);
    await expect(cache.setIfNewer('k', 'v', 3, 10.2)).resolves.toBe(true);
    await expect(cache.setIfNewer('k', 'v', 3, 10)).resolves.toBe(false);
    expect(runner.calls[0]?.[0]).toBe('EVALSHA');
    expect(runner.calls[0]?.[1].slice(1)).toEqual([
      1,
      'svc:routing:k',
      'v',
      '3',
      '11',
    ]);
  });

  it('loads the script again when the server lost it', async () => {
    const runner = new ScriptedValkeyRunner(
      ReplyErrors.of('NOSCRIPT No matching script.'),
      1,
    );
    await expect(cacheOver(runner).setIfNewer('k', 'v', 1, 10)).resolves.toBe(
      true,
    );
    expect(runner.commands).toEqual(['EVALSHA', 'EVAL']);
  });

  it('deletes the entry', async () => {
    const runner = new ScriptedValkeyRunner(1);
    await cacheOver(runner).delete('k');
    expect(runner.calls).toEqual([['DEL', ['svc:routing:k']]]);
  });

  it('validates before calling', async () => {
    const runner = new ScriptedValkeyRunner();
    const cache = cacheOver(runner);
    await expect(cache.setIfNewer('k', 'v', -1, 10)).rejects.toMatchObject({
      code: 'PLATFORM.SHARDING.INVALID_CONFIG',
    });
    await expect(cache.setIfNewer('k', 'v', 1.5, 10)).rejects.toMatchObject({
      code: 'PLATFORM.SHARDING.INVALID_CONFIG',
    });
    await expect(
      cache.setIfNewer('k', 'v', 1, Number.NaN),
    ).rejects.toMatchObject({ code: 'PLATFORM.SHARDING.INVALID_CONFIG' });
    expect(runner.calls).toHaveLength(0);
  });
});
