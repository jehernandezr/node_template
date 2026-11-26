import { createHash } from 'node:crypto';
import { FailureKind } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { FailureClassifier, InvalidArgumentError } from '@platform/primitives';
import type { RateLimitRule } from '@platform/rate-limit';
import { ValkeyCommand } from '../valkey-command.enum.js';
import { ValkeyCommandError } from '../valkey-command.error.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyRateLimiter } from '../valkey-rate-limiter.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';
import { ReplyErrors, ScriptedValkeyRunner } from './utils/index.js';

const keyspace = new ValkeyKeyspace('identity');
const RULE: RateLimitRule = {
  name: 'sign-in.email',
  limit: 5,
  windowMs: 60_000,
};
const NOW = new Date('2025-01-01T00:00:00.250Z');

function limiterWith(runner: ScriptedValkeyRunner): ValkeyRateLimiter {
  return new ValkeyRateLimiter(
    new ValkeyCommandExecutor(runner, new ValkeyErrorTranslator()),
    keyspace,
    new FixedClock(NOW),
  );
}

const digest = createHash('sha256')
  .update('ana@example.com')
  .digest('base64url');
const window = Math.floor(NOW.getTime() / 60_000);
const CURRENT = `identity:ratelimit:{sign-in.email:${digest}}:60000:${window}`;
const PREVIOUS = `identity:ratelimit:{sign-in.email:${digest}}:60000:${window - 1}`;

describe('ValkeyRateLimiter', () => {
  it('counts with one EVALSHA on both windows of a hashed key', async () => {
    const runner = new ScriptedValkeyRunner([1, 2, 3]);
    const result = await limiterWith(runner).consume(
      'ana@example.com',
      RULE,
      2,
    );
    expect(result).toEqual({
      allowed: true,
      count: 5,
      remaining: 0,
      retryAfterMs: 0,
    });
    expect(runner.calls).toHaveLength(1);
    const [command, args] = runner.calls[0] ?? ['', []];
    expect(command).toBe(ValkeyCommand.EvalSha);
    expect(args.slice(1)).toEqual([2, CURRENT, PREVIOUS, 60_000, 250, 5, 2]);
    expect(JSON.stringify(args)).not.toContain('ana@example.com');
  });

  it('reports a rejection with the wait the counts imply', async () => {
    const runner = new ScriptedValkeyRunner([0, 0, 5]);
    expect(await limiterWith(runner).consume('ana@example.com', RULE)).toEqual({
      allowed: false,
      count: 5,
      remaining: 0,
      retryAfterMs: 71_750,
    });
  });

  it('falls back to EVAL with the source when the server lost the script', async () => {
    const runner = new ScriptedValkeyRunner(
      ReplyErrors.of('NOSCRIPT No matching script.'),
      [1, 0, 1],
    );
    await limiterWith(runner).consume('ana@example.com', RULE);
    expect(runner.commands).toEqual([
      ValkeyCommand.EvalSha,
      ValkeyCommand.Eval,
    ]);
    expect(String(runner.calls[1]?.[1][0])).toContain('INCRBY');
  });

  it('peeks both windows without counting', async () => {
    const runner = new ScriptedValkeyRunner([0, 4]);
    expect(await limiterWith(runner).peek('ana@example.com', RULE)).toEqual({
      allowed: true,
      count: 4,
      remaining: 1,
      retryAfterMs: 0,
    });
    const [command, args] = runner.calls[0] ?? ['', []];
    expect(command).toBe(ValkeyCommand.EvalSha);
    expect(args.slice(1)).toEqual([2, CURRENT, PREVIOUS]);
    expect(
      await limiterWith(new ScriptedValkeyRunner([0, 5])).peek(
        'ana@example.com',
        RULE,
      ),
    ).toMatchObject({ allowed: false, retryAfterMs: 71_750 });
  });

  it('resets by deleting both windows in one command', async () => {
    const runner = new ScriptedValkeyRunner(2);
    await limiterWith(runner).reset('ana@example.com', RULE);
    expect(runner.calls).toEqual([[ValkeyCommand.Del, [CURRENT, PREVIOUS]]]);
  });

  it('validates before sending anything', async () => {
    const runner = new ScriptedValkeyRunner();
    const limiter = limiterWith(runner);
    await expect(limiter.consume('k', RULE, 6)).rejects.toBeInstanceOf(
      InvalidArgumentError,
    );
    await expect(
      limiter.peek('k', { ...RULE, name: 'bad:name' }),
    ).rejects.toBeInstanceOf(InvalidArgumentError);
    await expect(limiter.reset('', RULE)).rejects.toBeInstanceOf(
      InvalidArgumentError,
    );
    expect(runner.calls).toHaveLength(0);
  });

  it.each([
    ['not an array', 'OK'],
    ['a short array', [1, 2]],
    ['a negative count', [1, -1, 2]],
    ['a non-integer', [1, '2', 3]],
  ])('refuses %s as a reply', async (_, reply) => {
    await expect(
      limiterWith(new ScriptedValkeyRunner(reply)).consume('k', RULE),
    ).rejects.toBeInstanceOf(ValkeyUnexpectedReplyError);
  });

  it('wraps a failing server so the breaker can tell it is transient', async () => {
    const runner = new ScriptedValkeyRunner(new Error('Connection is closed.'));
    const failure = await limiterWith(runner)
      .peek('k', RULE)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ValkeyCommandError);
    expect(new FailureClassifier().classify(failure)).toBe(
      FailureKind.Transient,
    );
  });
});
