import {
  CacheAside,
  CacheNotACounterError,
  VersionedKeyspace,
} from '@platform/cache';
import { classifyFailure, FailureKind } from '@platform/primitives';
import { ResilienceEventKind, ResilienceRegistry } from '@platform/resilience';
import { ReplyError } from 'iovalkey';
import { ValkeyCache } from './valkey-cache.js';
import {
  createValkeyClient,
  LuaScript,
  ValkeyCommand,
  type ValkeyArgument,
  type ValkeyCommandRunner,
} from './valkey-client.js';
import {
  classifyValkeyError,
  ValkeyCommandError,
  ValkeyErrorCode,
  ValkeyUnexpectedReplyError,
} from './valkey-error.js';
import { ValkeyRoutingCache } from './valkey-routing-cache.js';

function replyError(message: string): Error {
  return new (ReplyError as new (message: string) => Error)(message);
}

type Call = [string, ValkeyArgument[]];

/** Runner that records calls and answers from a script of replies or errors. */
function scripted(...answers: unknown[]): ValkeyCommandRunner & {
  calls: Call[];
} {
  const calls: Call[] = [];
  return {
    calls,
    call: async (command, args) => {
      calls.push([command, args]);
      const answer = answers.shift();
      if (answer instanceof Error) {
        throw answer;
      }
      return answer;
    },
  };
}

describe('classifyValkeyError', () => {
  it.each([
    [
      replyError('LOADING Valkey is loading the dataset in memory'),
      FailureKind.Transient,
    ],
    [
      replyError('READONLY You cannot write against a read only replica.'),
      FailureKind.Transient,
    ],
    [replyError('CLUSTERDOWN The cluster is down'), FailureKind.Transient],
    [
      replyError(
        'WRONGTYPE Operation against a key holding the wrong kind of value',
      ),
      FailureKind.Permanent,
    ],
    [replyError('ERR unknown command'), FailureKind.Permanent],
    [new Error('Command timed out'), FailureKind.Timeout],
    [new Error('Connection is closed.'), FailureKind.Transient],
    [
      Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      }),
      FailureKind.Transient,
    ],
  ])('classifies %p', (error, kind) => {
    expect(classifyValkeyError(error)).toBe(kind);
    // The wrapped error carries the kind, so the resilience breaker reads it.
    expect(classifyFailure(new ValkeyCommandError('GET', kind, error))).toBe(
      kind,
    );
  });

  it('never puts keys or values in the message', () => {
    const error = new ValkeyCommandError(
      'GET',
      FailureKind.Transient,
      new Error('secret-key'),
    );
    expect(error.message).toBe('Valkey command GET failed');
    expect(error.code).toBe(ValkeyErrorCode.CommandFailed);
    expect(error.retryable).toBe(true);
  });
});

describe('LuaScript', () => {
  it('runs by SHA and falls back to EVAL when the server lost the script', async () => {
    const script = new LuaScript('return 1');
    const runner = scripted(replyError('NOSCRIPT No matching script.'), 1);
    await expect(script.run(runner, ['k'], ['a'])).resolves.toBe(1);
    expect(runner.calls).toEqual([
      [ValkeyCommand.EvalSha, [script.sha, 1, 'k', 'a']],
      [ValkeyCommand.Eval, ['return 1', 1, 'k', 'a']],
    ]);
  });

  it('wraps other failures', async () => {
    const script = new LuaScript('return 1');
    await expect(
      script.run(scripted(new Error('Connection is closed.')), [], []),
    ).rejects.toMatchObject({
      code: ValkeyErrorCode.CommandFailed,
      failureKind: FailureKind.Transient,
    });
  });
});

describe('ValkeyCache commands', () => {
  it('maps the port to atomic commands with the key prefix', async () => {
    const runner = scripted(null, 'OK', 'OK', null, 1, 1, 3);
    const cache = new ValkeyCache(runner, { keyPrefix: 'svc:' });

    await expect(cache.get('a')).resolves.toBeUndefined();
    await cache.set('a', 'v');
    await cache.set('a', 'v', 1_499.2);
    await expect(cache.setIfAbsent('a', 'v')).resolves.toBe(false);
    await cache.delete('a');
    await cache.set('a', 'v', 0);
    await expect(cache.incr('n')).resolves.toBe(3);

    expect(runner.calls).toEqual([
      ['GET', ['svc:a']],
      ['SET', ['svc:a', 'v']],
      ['SET', ['svc:a', 'v', 'PX', 1_500]],
      ['SET', ['svc:a', 'v', 'NX']],
      ['DEL', ['svc:a']],
      ['DEL', ['svc:a']],
      ['INCR', ['svc:n']],
    ]);
  });

  it('rejects a negative TTL before calling', async () => {
    const runner = scripted();
    await expect(
      new ValkeyCache(runner).set('a', 'v', -1),
    ).rejects.toMatchObject({
      code: 'PLATFORM.CACHE.INVALID_ARGUMENT',
    });
    expect(runner.calls).toHaveLength(0);
  });

  it('turns a non-integer INCR into CacheNotACounterError', async () => {
    const runner = scripted(
      replyError('ERR value is not an integer or out of range'),
    );
    await expect(new ValkeyCache(runner).incr('a')).rejects.toBeInstanceOf(
      CacheNotACounterError,
    );
  });

  it('refuses a reply of the wrong shape', async () => {
    await expect(new ValkeyCache(scripted(42)).get('a')).rejects.toBeInstanceOf(
      ValkeyUnexpectedReplyError,
    );
  });
});

describe('ValkeyRoutingCache arguments', () => {
  it('validates before calling', async () => {
    const runner = scripted();
    const cache = new ValkeyRoutingCache(runner);
    await expect(cache.setIfNewer('k', 'v', -1, 10)).rejects.toMatchObject({
      code: 'PLATFORM.SHARDING.INVALID_CONFIG',
    });
    await expect(
      cache.setIfNewer('k', 'v', 1, Number.NaN),
    ).rejects.toMatchObject({
      code: 'PLATFORM.SHARDING.INVALID_CONFIG',
    });
    expect(runner.calls).toHaveLength(0);
  });
});

describe('with Valkey down', () => {
  it('fails with a transient error and the cache breaker opens', async () => {
    // Nothing listens on port 1: every connection is refused at once.
    const client = createValkeyClient({
      url: 'redis://127.0.0.1:1',
      connectTimeoutMs: 200,
    });
    try {
      const cache = new ValkeyCache(client);
      await expect(cache.get('a')).rejects.toMatchObject({
        code: ValkeyErrorCode.CommandFailed,
        failureKind: FailureKind.Transient,
      });

      const registry = new ResilienceRegistry();
      const events: ResilienceEventKind[] = [];
      registry.onEvent((event) => {
        events.push(event.kind);
      });
      const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
        resilience: registry,
      });
      for (let i = 0; i < 6; i += 1) {
        await expect(
          aside.getOrLoad({
            namespace: ['t1'],
            params: {},
            ttlMs: 1_000,
            load: async () => 'db',
          }),
        ).resolves.toBe('db');
      }
      expect(events).toContain(ResilienceEventKind.Break);
    } finally {
      client.disconnect();
    }
  });
});
