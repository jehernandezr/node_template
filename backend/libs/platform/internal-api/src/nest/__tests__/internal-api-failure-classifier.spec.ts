import 'reflect-metadata';
import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CallOutcomeKind, FailureClassifier } from '@platform/primitives';
import { InMemoryProcessedOperationStore } from '../../__tests__/utils/index.js';
import { InternalRouter } from '../../server/internal-router.js';
import { InternalApiModule } from '../internal-api.module.js';
import { InternalTransportKind } from '../internal-transport-kind.enum.js';
import { E2eOperations } from './utils/e2e-operations.js';
import { FailoverHandlers } from './utils/failover-handlers.js';
import { InternalApiPlatformTestingModule } from './utils/internal-api-platform-testing.module.js';
import { SqlStateFailureRule } from './utils/sql-state-failure-rule.js';

/** The service provides its classifier with the rules of its adapters, like the platform runtime. */
@Global()
@Module({
  providers: [
    {
      provide: FailureClassifier,
      useFactory: () =>
        new FailureClassifier([
          new SqlStateFailureRule(new Set([FailoverHandlers.ADMIN_SHUTDOWN])),
        ]),
    },
  ],
  exports: [FailureClassifier],
})
class ServiceFailuresModule {}

async function greetDuringFailover(
  imports: readonly unknown[],
): Promise<unknown> {
  const ref = await Test.createTestingModule({
    imports: [
      InternalApiPlatformTestingModule,
      ...(imports as []),
      InternalApiModule.forRoot({
        transport: InternalTransportKind.InProcess,
        processedStore: InMemoryProcessedOperationStore,
        operations: [E2eOperations.Greet],
      }),
    ],
    providers: [FailoverHandlers],
  }).compile();
  await ref.init();
  try {
    return await ref.get(InternalRouter).handle(
      E2eOperations.Greet.id,
      { name: 'Ana' },
      {
        idempotencyKey: 'failover-1',
        timeoutMs: 5_000,
        deadline: Date.now() + 5_000,
      },
    );
  } finally {
    await ref.close();
  }
}

describe('InternalApiModule failure classification', () => {
  it('answers a handler that lost its database connection as a transient failure the caller retries', async () => {
    await expect(
      greetDuringFailover([ServiceFailuresModule]),
    ).resolves.toMatchObject({ kind: CallOutcomeKind.TransientFailure });
  });

  it('answers the same failure as a protocol violation without the classifier of the service', async () => {
    await expect(greetDuringFailover([])).resolves.toMatchObject({
      kind: CallOutcomeKind.ProtocolViolation,
    });
  });
});
