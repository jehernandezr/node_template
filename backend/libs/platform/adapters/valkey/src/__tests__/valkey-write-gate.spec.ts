import { SystemClock } from '@platform/kernel';
import { ValkeyCircuit } from '../valkey-circuit.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyWriteGate } from '../valkey-write-gate.js';
import { ReplyErrors, ScriptedValkeyRunner } from './utils/index.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';

function gateOver(runner: ScriptedValkeyRunner): ValkeyWriteGate {
  return new ValkeyWriteGate(
    new ValkeyCommandExecutor(
      runner,
      new ValkeyErrorTranslator(),
      new ValkeyCircuit(new SystemClock()),
    ),
    new ValkeyKeyspace('svc'),
  );
}

describe('ValkeyWriteGate', () => {
  it('reads the gate key of the tenant', async () => {
    const runner = new ScriptedValkeyRunner(1);

    await expect(gateOver(runner).isClosed(TENANT)).resolves.toBe(true);
    expect(runner.calls).toEqual([
      ['EXISTS', [`svc:tenant-write-gate:${TENANT}`]],
    ]);
  });

  it('is open when the key does not exist', async () => {
    await expect(
      gateOver(new ScriptedValkeyRunner(0)).isClosed(TENANT),
    ).resolves.toBe(false);
  });

  it('counts as closed when Valkey does not answer', async () => {
    await expect(
      gateOver(
        new ScriptedValkeyRunner(new Error('Connection is closed.')),
      ).isClosed(TENANT),
    ).resolves.toBe(true);
  });

  it('lets a rejected command through as an error', async () => {
    await expect(
      gateOver(
        new ScriptedValkeyRunner(ReplyErrors.of('NOPERM no permissions')),
      ).isClosed(TENANT),
    ).rejects.toThrow('Valkey command EXISTS failed');
  });
});
