import { FixedRandomSource } from '@platform/kernel/test-utils';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyJobLock } from '../valkey-job-lock.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ScriptedValkeyRunner } from './utils/index.js';

function lockOver(runner: ScriptedValkeyRunner): ValkeyJobLock {
  return new ValkeyJobLock(
    new ValkeyCommandExecutor(runner, new ValkeyErrorTranslator()),
    new ValkeyKeyspace('svc'),
    new FixedRandomSource([0.5], 0xab),
  );
}

describe('ValkeyJobLock commands', () => {
  it('takes the lock with SET NX PX and a token from the random source', async () => {
    const runner = new ScriptedValkeyRunner('OK');
    const lease = await lockOver(runner).tryAcquire('outbox-relay', 30_000);
    const token = 'ab'.repeat(16);
    expect(lease).toEqual({ name: 'outbox-relay', token });
    expect(runner.calls).toEqual([
      ['SET', ['svc:joblock:outbox-relay', token, 'NX', 'PX', 30_000]],
    ]);
  });

  it('returns nothing when another process holds the lock', async () => {
    await expect(
      lockOver(new ScriptedValkeyRunner(null)).tryAcquire('job', 1_000),
    ).resolves.toBeUndefined();
  });

  it('releases with a script that checks the token', async () => {
    const runner = new ScriptedValkeyRunner(1);
    await lockOver(runner).release({ name: 'job', token: 'abc' });
    expect(runner.calls[0]?.[0]).toBe('EVALSHA');
    expect(runner.calls[0]?.[1].slice(1)).toEqual([
      1,
      'svc:joblock:job',
      'abc',
    ]);
  });

  it.each([
    [1, true],
    [0, false],
  ])(
    'renews with a script that checks the token (reply %p means held: %p)',
    async (reply, held) => {
      const runner = new ScriptedValkeyRunner(reply);
      await expect(
        lockOver(runner).renew({ name: 'job', token: 'abc' }, 5_000),
      ).resolves.toBe(held);
      expect(runner.calls[0]?.[0]).toBe('EVALSHA');
      expect(runner.calls[0]?.[1].slice(1)).toEqual([
        1,
        'svc:joblock:job',
        'abc',
        5_000,
      ]);
    },
  );

  it('rejects a renewal ttl that is not a positive integer before calling', async () => {
    const runner = new ScriptedValkeyRunner();
    await expect(
      lockOver(runner).renew({ name: 'job', token: 'abc' }, 0),
    ).rejects.toThrow();
    expect(runner.calls).toHaveLength(0);
  });

  it.each([
    ['', 1_000],
    ['job', 0],
    ['job', 1.5],
    ['job', -5],
  ])('rejects the arguments (%p, %p) before calling', async (name, ttl) => {
    const runner = new ScriptedValkeyRunner();
    await expect(lockOver(runner).tryAcquire(name, ttl)).rejects.toThrow();
    expect(runner.calls).toHaveLength(0);
  });
});
