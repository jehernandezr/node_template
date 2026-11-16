import { ValkeyCommandExecutor } from '../../valkey-command-executor.js';
import type { ValkeyCommandRunner } from '../../valkey-command-runner.js';
import { ValkeyErrorTranslator } from '../../valkey-error-translator.js';

/** Arma el ejecutor de comandos que los adaptadores reciben. */
export class ValkeyExecutors {
  static over(client: ValkeyCommandRunner): ValkeyCommandExecutor {
    return new ValkeyCommandExecutor(client, new ValkeyErrorTranslator());
  }
}
