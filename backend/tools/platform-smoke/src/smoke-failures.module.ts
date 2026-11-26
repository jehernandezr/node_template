import { Global, Module } from '@nestjs/common';
import { AwsErrorTranslator } from '@platform/adapters-aws';
import { ValkeyErrorTranslator } from '@platform/adapters-valkey';
import { PostgresFailureRule } from '@platform/persistence';
import { FailureClassifier } from '@platform/primitives';

/**
 * The failure classifier with the rules of the Postgres, AWS and Valkey adapters, as a service runtime provides it.
 * The internal API, the consumers and the sagas inject it, so it lives in a global module.
 */
@Global()
@Module({
  providers: [
    {
      provide: FailureClassifier,
      useFactory: () =>
        new FailureClassifier([
          new PostgresFailureRule(),
          new AwsErrorTranslator(),
          new ValkeyErrorTranslator(),
        ]),
    },
  ],
  exports: [FailureClassifier],
})
export class SmokeFailuresModule {}
