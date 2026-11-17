import 'reflect-metadata';
import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionManager } from '@platform/kernel';
import { CallOutcome } from '@platform/primitives';
import { InternalClient } from '../../client/internal-client.js';
import {
  InMemoryProcessedOperationStore,
  RecordingTransactionManager,
} from '../../__tests__/utils/index.js';
import { HandlerUnitOfWork } from '../handler-unit-of-work.enum.js';
import { InternalApiModule } from '../internal-api.module.js';
import { InternalTransportKind } from '../internal-transport-kind.enum.js';
import { InternalApiPlatformTestingModule } from './utils/internal-api-platform-testing.module.js';
import { E2eOperations } from './utils/e2e-operations.js';
import { GreeterHandlers } from './utils/greeter-handlers.js';

const transactions = new RecordingTransactionManager();

/** El servicio provee su `TransactionManager`, como `PersistenceModule`. */
@Global()
@Module({
  providers: [{ provide: TransactionManager, useValue: transactions }],
  exports: [TransactionManager],
})
class RecordingTransactionsModule {}

async function greetWith(unitOfWork?: HandlerUnitOfWork): Promise<unknown> {
  const ref = await Test.createTestingModule({
    imports: [
      InternalApiPlatformTestingModule,
      RecordingTransactionsModule,
      InternalApiModule.forRoot({
        transport: InternalTransportKind.InProcess,
        processedStore: InMemoryProcessedOperationStore,
        operations: [E2eOperations.Greet],
        ...(unitOfWork === undefined ? {} : { unitOfWork }),
      }),
    ],
    providers: [GreeterHandlers],
  }).compile();
  await ref.init();
  try {
    return await ref
      .get(InternalClient)
      .call(E2eOperations.Greet, { name: 'Ana' }, { idempotencyKey: 'k-1' });
  } finally {
    await ref.close();
  }
}

describe('InternalApiModule unit of work', () => {
  beforeEach(() => {
    transactions.commits = 0;
  });

  it('runs the handler and the stored result in one transaction by default', async () => {
    const outcome = await greetWith();

    expect(outcome).toEqual(CallOutcome.success({ greeting: 'Hello Ana' }));
    expect(transactions.commits).toBe(1);
  });

  it('lets the handler open its own transactions with HandlerUnitOfWork.Handler', async () => {
    const outcome = await greetWith(HandlerUnitOfWork.Handler);

    expect(outcome).toEqual(CallOutcome.success({ greeting: 'Hello Ana' }));
    expect(transactions.commits).toBe(0);
  });
});
