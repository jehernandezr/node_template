import { createHash } from 'node:crypto';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  classifyFailure,
  FailureKind,
  InvalidArgumentError,
} from '@platform/primitives';
import type { RateLimitRule } from '@platform/rate-limit';
import { ReplyError } from 'iovalkey';
import {
  ValkeyCommand,
  type ValkeyArgument,
  type ValkeyCommandRunner,
} from '../../valkey-client.js';
import {
  ValkeyCommandError,
  ValkeyUnexpectedReplyError,
} from '../../valkey-error.js';
import { ValkeyKeyspace } from '../../valkey-keyspace.js';
import { ValkeyRateLimiter } from '../valkey-rate-limiter.js';

const keyspace = new ValkeyKeyspace('identity');
const RULE: RateLimitRule = {
  name: 'sign-in.email',
  limit: 5,
  windowMs: 60_000,
};
// 250 ms into window 28 928 160 of one minute.
const NOW = new Date('2025-01-01T00:00:00.250Z');

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

function limiterWith(runner: ValkeyCommandRunner): ValkeyRateLimiter {
  return new ValkeyRateLimiter(runner, {
    keyspace,
    clock: new FixedClock(NOW),
  });
}

const digest = createHash('sha256')
  .update('ana@example.com')
  .digest('base64url');
const window = Math.floor(NOW.getTime() / 60_000);
const CURRENT = `identity:ratelimit:{sign-in.email:${digest}}:60000:${window}`;
const PREVIOUS = `identity:ratelimit:{sign-in.email:${digest}}:60000:${window - 1}`;

describe('ValkeyRateLimiter', () => {
  it('counts with one EVALSHA on both windows of a hashed key', async () => {
    const runner = scripted([1, 2, 3]);
    const result = await limiterWith(runner).consume(
      'ana@example.com',
      RULE,
      2,
    );
    expect(result).toEqual({
      allowed: true,
      // 2 previous weigh just under 2 at 250 ms of 60 s, plus 3 current.
      count: 5,
      remaining: 0,
      retryAfterMs: 0,
    });
    expect(runner.calls).toHaveLength(1);
    const [command, args] = runner.calls[0] as Call;
    expect(command).toBe(ValkeyCommand.EvalSha);
    expect(args.slice(1)).toEqual([2, CURRENT, PREVIOUS, 60_000, 250, 5, 2]);
    expect(JSON.stringify(args)).not.toContain('ana@example.com');
  });

  it('reports a rejection with the wait the counts imply', async () => {
    const runner = scripted([0, 0, 5]);
    expect(await limiterWith(runner).consume('ana@example.com', RULE)).toEqual({
      allowed: false,
      count: 5,
      remaining: 0,
      // The next window, once the 5 fade to 4: 59 750 + 12 000 ms.
      retryAfterMs: 71_750,
    });
  });

  it('falls back to EVAL with the source when the server lost the script', async () => {
    const runner = scripted(
      replyError('NOSCRIPT No matching script.'),
      [1, 0, 1],
    );
    await limiterWith(runner).consume('ana@example.com', RULE);
    expect(runner.calls.map(([command]) => command)).toEqual([
      ValkeyCommand.EvalSha,
      ValkeyCommand.Eval,
    ]);
    expect(String(runner.calls[1]?.[1][0])).toContain('INCRBY');
  });

  it('peeks both windows without counting', async () => {
    const runner = scripted([0, 4]);
    expect(await limiterWith(runner).peek('ana@example.com', RULE)).toEqual({
      allowed: true,
      count: 4,
      remaining: 1,
      retryAfterMs: 0,
    });
    const [command, args] = runner.calls[0] as Call;
    expect(command).toBe(ValkeyCommand.EvalSha);
    expect(args.slice(1)).toEqual([2, CURRENT, PREVIOUS]);
    expect(
      await limiterWith(scripted([0, 5])).peek('ana@example.com', RULE),
    ).toMatchObject({ allowed: false, retryAfterMs: 71_750 });
  });

  it('resets by deleting both windows in one command', async () => {
    const runner = scripted(2);
    await limiterWith(runner).reset('ana@example.com', RULE);
    expect(runner.calls).toEqual([[ValkeyCommand.Del, [CURRENT, PREVIOUS]]]);
  });

  it('validates before sending anything', async () => {
    const runner = scripted();
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
      limiterWith(scripted(reply)).consume('k', RULE),
    ).rejects.toBeInstanceOf(ValkeyUnexpectedReplyError);
  });

  it('wraps a failing server so the breaker can tell it is transient', async () => {
    const runner = scripted(new Error('Connection is closed.'));
    const failure = await limiterWith(runner)
      .peek('k', RULE)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ValkeyCommandError);
    expect(classifyFailure(failure)).toBe(FailureKind.Transient);
  });

  it('uses the system clock by default', async () => {
    const runner = scripted([1, 0, 1]);
    const limiter = new ValkeyRateLimiter(runner, { keyspace });
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
  });
});
