import { AwsErrorTranslator } from '@platform/adapters-aws';
import { ValkeyErrorTranslator } from '@platform/adapters-valkey';
import { PostgresFailureRule } from '@platform/persistence';
import { FailureClassifier } from '@platform/primitives';

/**
 * The failure classifier of a service, with the rules of the adapters the runtime brings: a transient Postgres SQLSTATE,
 * a retryable AWS SDK error or a transient Valkey response are retried. It is shared by the
 * internal API server, the consumers and the sagas, so a database failover does not end up in the
 * dead-letter queue or compensate a saga.
 */
export class PlatformFailureClassifier extends FailureClassifier {
  constructor() {
    super([
      new PostgresFailureRule(),
      new AwsErrorTranslator(),
      new ValkeyErrorTranslator(),
    ]);
  }
}
