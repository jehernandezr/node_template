import { FailureKind } from '@platform/kernel';
import { LuaScript } from '../lua-script.js';
import { ValkeyCommand } from '../valkey-command.enum.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorCode } from '../valkey-error-code.enum.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';
import { ReplyErrors, ScriptedValkeyRunner } from './utils/index.js';

function executorOver(runner: ScriptedValkeyRunner): ValkeyCommandExecutor {
  return new ValkeyCommandExecutor(runner, new ValkeyErrorTranslator());
}

describe('LuaScript', () => {
  it('names the script by the SHA-1 of its source', () => {
    expect(new LuaScript('return 1').sha).toBe(
      'e0e1f9fabfc9d4800c877a703b823ac0578ff8db',
    );
  });
});

describe('ValkeyCommandExecutor', () => {
  it('sends a command and returns the reply', async () => {
    const runner = new ScriptedValkeyRunner('PONG');
    await expect(
      executorOver(runner).run(ValkeyCommand.Ping, []),
    ).resolves.toBe('PONG');
    expect(runner.calls).toEqual([['PING', []]]);
  });

  it('wraps a failure so the classifier can tell it is transient', async () => {
    const runner = new ScriptedValkeyRunner(new Error('Connection is closed.'));
    await expect(
      executorOver(runner).run(ValkeyCommand.Get, ['k']),
    ).rejects.toMatchObject({
      code: ValkeyErrorCode.CommandFailed,
      failureKind: FailureKind.Transient,
      command: 'GET',
    });
  });

  describe('script', () => {
    const script = new LuaScript('return 1');

    it('runs by SHA first', async () => {
      const runner = new ScriptedValkeyRunner(1);
      await expect(
        executorOver(runner).script(script, ['k'], ['a']),
      ).resolves.toBe(1);
      expect(runner.calls).toEqual([
        [ValkeyCommand.EvalSha, [script.sha, 1, 'k', 'a']],
      ]);
    });

    it('falls back to EVAL when the server lost the script', async () => {
      const runner = new ScriptedValkeyRunner(
        ReplyErrors.of('NOSCRIPT No matching script.'),
        1,
      );
      await expect(
        executorOver(runner).script(script, ['k'], ['a']),
      ).resolves.toBe(1);
      expect(runner.calls).toEqual([
        [ValkeyCommand.EvalSha, [script.sha, 1, 'k', 'a']],
        [ValkeyCommand.Eval, ['return 1', 1, 'k', 'a']],
      ]);
    });

    it('wraps any other failure', async () => {
      const runner = new ScriptedValkeyRunner(
        new Error('Connection is closed.'),
      );
      await expect(
        executorOver(runner).script(script, [], []),
      ).rejects.toMatchObject({
        code: ValkeyErrorCode.CommandFailed,
        failureKind: FailureKind.Transient,
        command: 'EVALSHA',
      });
    });

    it('wraps a failure of the EVAL fallback', async () => {
      const runner = new ScriptedValkeyRunner(
        ReplyErrors.of('NOSCRIPT No matching script.'),
        ReplyErrors.of('ERR Error compiling script'),
      );
      await expect(
        executorOver(runner).script(script, [], []),
      ).rejects.toMatchObject({
        failureKind: FailureKind.Permanent,
        command: 'EVAL',
      });
    });
  });

  describe('reading replies', () => {
    const executor = executorOver(new ScriptedValkeyRunner());

    it('reads an integer', () => {
      expect(executor.integer(ValkeyCommand.Del, 3)).toBe(3);
    });

    it.each([['3'], [1.5], [null], [Number.MAX_SAFE_INTEGER + 2]])(
      'refuses %p as an integer',
      (reply) => {
        expect(() => executor.integer(ValkeyCommand.Del, reply)).toThrow(
          ValkeyUnexpectedReplyError,
        );
      },
    );

    it('reads a string that may be nil', () => {
      expect(executor.optionalString(ValkeyCommand.Get, 'v')).toBe('v');
      expect(executor.optionalString(ValkeyCommand.Get, null)).toBeUndefined();
      expect(() => executor.optionalString(ValkeyCommand.Get, 42)).toThrow(
        ValkeyUnexpectedReplyError,
      );
    });
  });
});
