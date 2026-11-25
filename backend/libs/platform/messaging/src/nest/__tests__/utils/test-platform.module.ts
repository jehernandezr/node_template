import { Global, Module } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import {
  LoggerPort,
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import {
  InMemoryOutboxStore,
  InMemoryProcessedMessageStore,
  InMemoryTransactionManager,
  RecordingEnvelopePublisher,
  SilentLogger,
} from '../../../__tests__/utils/index.js';

/**
 * Adapters and services that, in an application, provide observability and the
 * stores. They are global, as they would be in the real service.
 */
@Global()
@Module({
  providers: [
    { provide: Tracing, useFactory: () => new Tracing(new Redactor()) },
    {
      provide: TraceContextRestorer,
      useFactory: (tracing: Tracing) => new TraceContextRestorer(tracing),
      inject: [Tracing],
    },
    SilentLogger,
    { provide: LoggerPort, useExisting: SilentLogger },
    InMemoryTransactionManager,
    { provide: TransactionManager, useExisting: InMemoryTransactionManager },
    {
      provide: InMemoryOutboxStore,
      useFactory: (transactions: TransactionManager) =>
        new InMemoryOutboxStore({ transactions }),
      inject: [TransactionManager],
    },
    {
      provide: InMemoryProcessedMessageStore,
      useFactory: () => new InMemoryProcessedMessageStore(),
    },
    {
      provide: RecordingEnvelopePublisher,
      useFactory: () => new RecordingEnvelopePublisher(),
    },
  ],
  exports: [
    Tracing,
    TraceContextRestorer,
    SilentLogger,
    LoggerPort,
    TransactionManager,
    InMemoryTransactionManager,
    InMemoryOutboxStore,
    InMemoryProcessedMessageStore,
    RecordingEnvelopePublisher,
  ],
})
export class TestPlatformModule {}
