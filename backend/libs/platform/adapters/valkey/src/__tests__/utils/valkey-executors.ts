import { SystemClock } from '@platform/kernel';
import { ValkeyCommandExecutor } from '../../valkey-command-executor.js';
import type { ValkeyCommandRunner } from '../../valkey-command-runner.js';
import { ValkeyErrorTranslator } from '../../valkey-error-translator.js';
import { ValkeyCircuit } from '../../valkey-circuit.js';

/** Builds the command executor the adapters receive. */
export class ValkeyExecutors {
  static over(client: ValkeyCommandRunner): ValkeyCommandExecutor {
    return new ValkeyCommandExecutor(
      client,
      new ValkeyErrorTranslator(),
      new ValkeyCircuit(new SystemClock()),
    );
  }
}
