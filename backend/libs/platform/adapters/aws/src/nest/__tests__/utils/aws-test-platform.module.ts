import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { MessageDispatcher } from '@platform/messaging';
import {
  InMemoryProcessedMessageStore,
  SilentLogger,
} from '@platform/messaging/test-utils';
import {
  LoggerPort,
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import { AWS_TEST_SETTINGS } from '../../../__tests__/utils/aws-test-settings.js';
import { TestTopology } from '../../../__tests__/utils/test-topology.js';

/**
 * What a real application provides around the adapter: configuration,
 * observability and the message dispatcher. It is global, as in the service.
 */
@Global()
@Module({
  imports: [ConfigModule.forRoot({ env: { ...AWS_TEST_SETTINGS } })],
  providers: [
    { provide: LoggerPort, useValue: new SilentLogger() },
    {
      provide: TraceContextRestorer,
      useValue: new TraceContextRestorer(new Tracing(new Redactor())),
    },
    {
      provide: MessageDispatcher,
      useValue: new MessageDispatcher({
        consumer: 'reports-work',
        processed: new InMemoryProcessedMessageStore(),
        topology: TestTopology.topology,
      }),
    },
  ],
  exports: [LoggerPort, TraceContextRestorer, MessageDispatcher],
})
export class AwsTestPlatformModule {}
