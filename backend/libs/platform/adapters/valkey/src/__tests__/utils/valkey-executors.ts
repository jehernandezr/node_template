import { ValkeyCommandExecutor } from '../../valkey-command-executor.js';
import type { ValkeyCommandRunner } from '../../valkey-command-runner.js';
import { ValkeyErrorTranslator } from '../../valkey-error-translator.js';

/** Builds the command executor the adapters receive. */
export class ValkeyExecutors {
  static over(client: ValkeyCommandRunner): ValkeyCommandExecutor {
    return new ValkeyCommandExecutor(client, new ValkeyErrorTranslator());
  }
}
