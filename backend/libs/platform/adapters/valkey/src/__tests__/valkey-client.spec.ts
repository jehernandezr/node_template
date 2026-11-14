import { ConfigValidationError } from '@platform/config';
import { CacheAside, VersionedKeyspace } from '@platform/cache';
import { classifyFailure, FailureKind } from '@platform/primitives';
import { ResilienceEventKind, ResilienceRegistry } from '@platform/resilience';
import { ReplyError } from 'iovalkey';
import { ValkeyCache } from '../valkey-cache.js';
import {
  createTokenAuthenticatedValkeyClient,
  createValkeyClient,
  LuaScript,
  ValkeyCommand,
  type ValkeyArgument,
  type ValkeyCommandRunner,
} from '../valkey-client.js';
import {
  classifyValkeyError,
  ValkeyCommandError,
  ValkeyErrorCode,
  ValkeyUnexpectedReplyError,
} from '../valkey-error.js';
import {
  ValkeyAuthMode,
  valkeyConfigSchema,
  valkeyConnectionFromConfig,
} from '../valkey-config.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyRoutingCache } from '../valkey-routing-cache.js';

const keyspace = new ValkeyKeyspace('svc');

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
    const runner = scripted(null, 'OK', 'OK', null, 1, 1);
    const cache = new ValkeyCache(runner, { keyspace });

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

  it('rejects a negative TTL before calling', async () => {
    const runner = scripted();
    await expect(
      new ValkeyCache(runner, { keyspace }).set('a', 'v', -1),
    ).rejects.toMatchObject({
      code: 'PLATFORM.CACHE.INVALID_ARGUMENT',
    });
    expect(runner.calls).toHaveLength(0);
  });

  it('refuses a reply of the wrong shape', async () => {
    await expect(
      new ValkeyCache(scripted(42), { keyspace }).get('a'),
    ).rejects.toBeInstanceOf(ValkeyUnexpectedReplyError);
  });
});

describe('ValkeyRoutingCache arguments', () => {
  it('validates before calling', async () => {
    const runner = scripted();
    const cache = new ValkeyRoutingCache(runner, { keyspace });
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
      const cache = new ValkeyCache(client, { keyspace });
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
        transactions: { isInTransaction: () => false },
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

describe('ValkeyKeyspace', () => {
  it('joins parts under the prefix and rejects prefixes the ACL cannot express', () => {
    expect(keyspace.key('a', 'b')).toBe('svc:a:b');
    for (const prefix of ['', 'a:b', 'with space', 'x'.repeat(65)]) {
      expect(() => new ValkeyKeyspace(prefix)).toThrow(ConfigValidationError);
    }
  });
});

describe('valkeyConnectionFromConfig', () => {
  const token = async (): Promise<string> => 'token';
  const parse = (env: Record<string, string>) => valkeyConfigSchema.parse(env);

  it('connects by URL locally, without a key prefix default', () => {
    expect(() => parse({ VALKEY_URL: 'redis://localhost:6379' })).toThrow();
    const config = parse({
      VALKEY_URL: 'redis://localhost:6379',
      VALKEY_KEY_PREFIX: 'identity',
    });
    expect(valkeyConnectionFromConfig(config)).toEqual({
      connection: expect.objectContaining({ url: 'redis://localhost:6379' }),
      authToken: undefined,
    });
  });

  it('reads the variables the service stack of Terraform injects', () => {
    const config = parse({
      VALKEY_HOST: 'cache.serverless.use1.cache.amazonaws.com',
      VALKEY_PORT: '6379',
      VALKEY_TLS: 'true',
      VALKEY_USER: 'node-template-dev-identity',
      VALKEY_AUTH: ValkeyAuthMode.IamServerless,
      VALKEY_CACHE_NAME: 'node-template-dev-valkey',
      VALKEY_KEY_PREFIX: 'identity',
    });

    expect(valkeyConnectionFromConfig(config, { authToken: token })).toEqual({
      connection: expect.objectContaining({
        host: 'cache.serverless.use1.cache.amazonaws.com',
        port: 6379,
        tls: true,
        username: 'node-template-dev-identity',
      }),
      authToken: token,
    });
  });

  it('lists every inconsistent variable', () => {
    const config = parse({
      VALKEY_URL: 'redis://localhost:6379',
      VALKEY_HOST: 'cache',
      VALKEY_AUTH: ValkeyAuthMode.Iam,
      VALKEY_KEY_PREFIX: 'identity',
    });

    let error: unknown;
    try {
      valkeyConnectionFromConfig(config);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect(
      (error as ConfigValidationError).issues.map((issue) => issue.path),
    ).toEqual([
      'VALKEY_URL',
      'VALKEY_USER',
      'VALKEY_CACHE_NAME',
      'VALKEY_TLS',
      'VALKEY_AUTH',
    ]);
  });
});

describe('createTokenAuthenticatedValkeyClient', () => {
  it('asks for a fresh token before each connection and sends it as the password', async () => {
    let issued = 0;
    const authToken = jest.fn(async () => {
      issued += 1;
      return `token-${issued}`;
    });
    // Nothing listens on port 1: each attempt fails at once, after AUTH is prepared.
    const client = await createTokenAuthenticatedValkeyClient(
      {
        host: '127.0.0.1',
        port: 1,
        tls: false,
        username: 'svc',
        connectTimeoutMs: 200,
      },
      authToken,
    );
    client.on('error', () => undefined);
    try {
      expect(client.options.password).toBe('token-1');
      expect(client.options.username).toBe('svc');
      // A command queued while the first attempt fails is rejected, not lost.
      await expect(client.call('GET', ['svc:a'])).rejects.toThrow();

      // Every reconnection, automatic or explicit, asked for its own token.
      client.disconnect();
      await expect(client.connect()).rejects.toThrow();
      expect(issued).toBeGreaterThan(1);
      expect(client.options.password).toBe(`token-${issued}`);
    } finally {
      client.disconnect();
    }
  });
});
