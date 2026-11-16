import { HealthState } from '@platform/kernel';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyHealthIndicator } from '../valkey-health-indicator.js';
import type { ValkeyCommandRunner } from '../valkey-command-runner.js';
import { ScriptedValkeyRunner } from './utils/index.js';

function indicatorOver(runner: ValkeyCommandRunner): ValkeyHealthIndicator {
  return new ValkeyHealthIndicator(
    new ValkeyCommandExecutor(runner, new ValkeyErrorTranslator()),
  );
}

describe('ValkeyHealthIndicator', () => {
  it('is named valkey', () => {
    expect(indicatorOver(new ScriptedValkeyRunner()).name).toBe('valkey');
  });

  it('is up when the server answers PONG', async () => {
    const runner = new ScriptedValkeyRunner('PONG');
    await expect(indicatorOver(runner).check()).resolves.toEqual({
      state: HealthState.Up,
    });
    expect(runner.calls).toEqual([['PING', []]]);
  });

  it('is down with the error name, never its message, when the command fails', async () => {
    const report = await indicatorOver(
      new ScriptedValkeyRunner(new Error('Connection is closed.')),
    ).check();
    expect(report).toEqual({
      state: HealthState.Down,
      detail: 'ValkeyCommandError',
    });
  });

  it('is down when the reply is not PONG', async () => {
    await expect(
      indicatorOver(new ScriptedValkeyRunner('LOADING')).check(),
    ).resolves.toEqual({ state: HealthState.Down, detail: 'unexpected reply' });
  });

  it('is down without sending anything when the signal is already aborted', async () => {
    const runner = new ScriptedValkeyRunner('PONG');
    const report = await indicatorOver(runner).check(AbortSignal.abort());
    expect(report).toEqual({ state: HealthState.Down, detail: 'AbortError' });
    expect(runner.calls).toHaveLength(0);
  });

  it('is down as soon as the signal aborts while the server is silent', async () => {
    const silent: ValkeyCommandRunner = {
      call: () => new Promise<never>(() => undefined),
    };
    const controller = new AbortController();
    const pending = indicatorOver(silent).check(controller.signal);
    controller.abort();
    await expect(pending).resolves.toEqual({
      state: HealthState.Down,
      detail: 'AbortError',
    });
  });

  it('is down with a generic name when the failure is not an Error', async () => {
    const throwing: ValkeyCommandRunner = {
      call: () => Promise.reject('refused'),
    };
    const report = await indicatorOver(throwing).check(
      new AbortController().signal,
    );
    expect(report.state).toBe(HealthState.Down);
  });
});
