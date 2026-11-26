import 'reflect-metadata';
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

async function greetDuringFailover(
  failures: FailureClassifier,
): Promise<unknown> {
  const ref = await Test.createTestingModule({
    imports: [
      InternalApiPlatformTestingModule,
      InternalApiModule.forRoot({
        transport: InternalTransportKind.InProcess,
        processedStore: InMemoryProcessedOperationStore,
        operations: [E2eOperations.Greet],
      }),
    ],
    providers: [FailoverHandlers],
  })
    .overrideProvider(FailureClassifier)
    .useValue(failures)
    .compile();
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
  it('answers a handler that lost its database connection as a transient failure with the classifier of the service', async () => {
    await expect(
      greetDuringFailover(
        new FailureClassifier([
          new SqlStateFailureRule(new Set([FailoverHandlers.ADMIN_SHUTDOWN])),
        ]),
      ),
    ).resolves.toMatchObject({ kind: CallOutcomeKind.TransientFailure });
  });

  it('answers the same failure as a protocol violation with a classifier that lacks the database rules', async () => {
    await expect(
      greetDuringFailover(new FailureClassifier()),
    ).resolves.toMatchObject({
      kind: CallOutcomeKind.ProtocolViolation,
    });
  });
});
