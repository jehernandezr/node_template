import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { ValkeyCircuit } from '../valkey-circuit.js';
import { ValkeyCommand } from '../valkey-command.enum.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyUnavailableError } from '../valkey-unavailable.error.js';
import {
  RecordingCircuitListener,
  RecordingErrorListener,
  ReplyErrors,
  ScriptedValkeyRunner,
  SilentValkeyRunner,
  ThrowingCircuitListener,
} from './utils/index.js';

const OPTIONS = {
  deadlineMs: 20,
  consecutiveFailures: 2,
  halfOpenAfterMs: 1_000,
};
const DOWN = 'Connection is closed.';

describe('ValkeyCircuit', () => {
  const clock = new FixedClock(new Date('2026-11-27T10:00:00.000Z'));
  let circuit: ValkeyCircuit;
  let listener: RecordingCircuitListener;

  const executorOver = (runner: ScriptedValkeyRunner | SilentValkeyRunner) =>
    new ValkeyCommandExecutor(runner, new ValkeyErrorTranslator(), circuit);

  beforeEach(() => {
    circuit = new ValkeyCircuit(clock, OPTIONS);
    listener = new RecordingCircuitListener();
    circuit.subscribe(listener);
  });

  it('answers a command that outlives its deadline as unavailable with a timeout', async () => {
    await expect(
      executorOver(new SilentValkeyRunner()).run(ValkeyCommand.Get, ['k']),
    ).rejects.toMatchObject({
      code: PlatformErrorCode.DependencyUnavailable,
      failureKind: FailureKind.Timeout,
      command: 'GET',
    });
  });

  it('opens after the consecutive failures and then fails at once without sending', async () => {
    const runner = new ScriptedValkeyRunner(new Error(DOWN), new Error(DOWN));
    const executor = executorOver(runner);
    await expect(executor.run(ValkeyCommand.Get, ['a'])).rejects.toThrow(
      ValkeyUnavailableError,
    );
    await expect(executor.run(ValkeyCommand.Get, ['b'])).rejects.toThrow(
      ValkeyUnavailableError,
    );

    await expect(executor.run(ValkeyCommand.Get, ['c'])).rejects.toMatchObject({
      code: PlatformErrorCode.DependencyUnavailable,
      command: 'GET',
    });
    expect(runner.calls).toHaveLength(2);
    expect(circuit.open).toBe(true);
    expect(listener.events).toEqual(['opened']);
  });

  it('closes after a successful trial once the half-open wait passed and tells its listeners', async () => {
    const runner = new ScriptedValkeyRunner(
      new Error(DOWN),
      new Error(DOWN),
      'PONG',
    );
    const executor = executorOver(runner);
    await executor.run(ValkeyCommand.Ping, []).catch(() => undefined);
    await executor.run(ValkeyCommand.Ping, []).catch(() => undefined);
    clock.advance(OPTIONS.halfOpenAfterMs);

    await expect(executor.run(ValkeyCommand.Ping, [])).resolves.toBe('PONG');
    expect(circuit.open).toBe(false);
    expect(listener.events).toEqual(['opened', 'closed']);
  });

  it('does not open when the server rejects the command itself', async () => {
    const runner = new ScriptedValkeyRunner(
      ReplyErrors.of('WRONGTYPE Operation against a key'),
      ReplyErrors.of('WRONGTYPE Operation against a key'),
      'v',
    );
    const executor = executorOver(runner);
    await executor.run(ValkeyCommand.Get, ['k']).catch(() => undefined);
    await executor.run(ValkeyCommand.Get, ['k']).catch(() => undefined);

    await expect(executor.run(ValkeyCommand.Get, ['k'])).resolves.toBe('v');
    expect(listener.events).toEqual([]);
  });

  it('stops telling a listener that unsubscribed', async () => {
    const late = new RecordingCircuitListener();
    circuit.subscribe(late)();
    const executor = executorOver(
      new ScriptedValkeyRunner(new Error(DOWN), new Error(DOWN)),
    );
    await executor.run(ValkeyCommand.Get, ['a']).catch(() => undefined);
    await executor.run(ValkeyCommand.Get, ['b']).catch(() => undefined);

    expect(late.events).toEqual([]);
  });

  it('reports a listener that throws and still tells the other listeners', async () => {
    const errors = new RecordingErrorListener();
    const reporting = new ValkeyCircuit(clock, OPTIONS, errors.report);
    const failing = new ThrowingCircuitListener(new Error('bridge failed'));
    const healthy = new RecordingCircuitListener();
    reporting.subscribe(failing);
    reporting.subscribe(healthy);
    const executor = new ValkeyCommandExecutor(
      new ScriptedValkeyRunner(new Error(DOWN), new Error(DOWN)),
      new ValkeyErrorTranslator(),
      reporting,
    );
    await executor.run(ValkeyCommand.Get, ['a']).catch(() => undefined);
    await executor.run(ValkeyCommand.Get, ['b']).catch(() => undefined);

    expect(healthy.events).toEqual(['opened']);
    expect(errors.errors).toEqual([failing.failure]);
  });
});
