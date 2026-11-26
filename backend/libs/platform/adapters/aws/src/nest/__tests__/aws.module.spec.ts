import { KernelModule } from '@platform/kernel/nest';
import { PublishCommand } from '@aws-sdk/client-sns';
import { GetQueueUrlCommand } from '@aws-sdk/client-sqs';
import type { DynamicModule } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { MessagingErrorCode, topologyFromContracts } from '@platform/messaging';
import { Eventually } from '@platform/messaging/test-utils';
import { FakeSesClient } from '../../__tests__/utils/fake-ses-client.js';
import { FakeSnsClient } from '../../__tests__/utils/fake-sns-client.js';
import { FakeSqsClient } from '../../__tests__/utils/fake-sqs-client.js';
import {
  ledgerContract,
  reportsContract,
  TaskClosed,
  tasksContract,
} from '../../__tests__/utils/test-contracts.js';
import { ElastiCacheIamAuthTokenProvider } from '../../elasticache-iam-auth-token-provider.js';
import { SnsSqsMessageBus } from '../../sns-sqs-message-bus.js';
import { SqsLambdaHandler } from '../../sqs-lambda-handler.js';
import { SqsPoller } from '../../sqs-poller.js';
import { AwsModule } from '../aws.module.js';
import { SesEmailClient } from '../../ses/ses-email-client.js';
import { SES_CLIENT, SNS_CLIENT, SQS_CLIENT } from '../aws.tokens.js';
import { SqsConsumerModule } from '../sqs-consumer.module.js';
import { AwsTestPlatformModule } from './utils/aws-test-platform.module.js';

const topology = topologyFromContracts([
  tasksContract,
  reportsContract,
  ledgerContract,
]);

describe('AwsModule and SqsConsumerModule', () => {
  let fakeSns: FakeSnsClient;
  let fakeSqs: FakeSqsClient;
  let fakeSes: FakeSesClient;
  let apps: TestingModule[];

  beforeEach(() => {
    fakeSns = new FakeSnsClient();
    fakeSqs = new FakeSqsClient();
    fakeSes = new FakeSesClient();
    apps = [];
  });

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
  });

  async function appWith(imports: DynamicModule[]) {
    const moduleRef = await Test.createTestingModule({
      imports: [KernelModule, AwsTestPlatformModule, ...imports],
    })
      .overrideProvider(SNS_CLIENT)
      .useValue(fakeSns)
      .overrideProvider(SQS_CLIENT)
      .useValue(fakeSqs)
      .overrideProvider(SES_CLIENT)
      .useValue(fakeSes)
      .compile();
    apps.push(moduleRef);
    await moduleRef.init();
    return moduleRef;
  }

  it('closes the SNS, SQS and SES clients when the application closes', async () => {
    const app = await appWith([AwsModule.forRoot()]);

    await app.close();
    apps.splice(apps.indexOf(app), 1);

    expect(fakeSns.closes).toBe(1);
    expect(fakeSqs.closes).toBe(1);
    expect(fakeSes.closes).toBe(1);
  });

  it('provides the SES email client over the module SES client', async () => {
    const app = await appWith([AwsModule.forRoot()]);

    await app.get(SesEmailClient, { strict: false }).send({
      from: 'noreply@example.test',
      to: 'user@example.test',
      subject: 'Subject',
      text: 'Text',
      html: '<p>Html</p>',
    });

    expect(fakeSes.sentEmails()).toHaveLength(1);
  });

  it('stops the poller before the clients are closed', async () => {
    fakeSqs.on(GetQueueUrlCommand, (input) => ({
      QueueUrl: `https://sqs.local/${input.QueueName}`,
    }));
    const app = await appWith([
      AwsModule.forRoot(),
      SqsConsumerModule.forRoot({
        topology,
        queue: 'reports-work',
        consumer: { errorDelayMs: 0 },
      }),
    ]);
    await Eventually.until(() => fakeSqs.pendingReceives === 1);

    await app.close();
    apps.splice(apps.indexOf(app), 1);

    expect(fakeSqs.pendingReceivesAtClose).toBe(0);
    expect(fakeSqs.closes).toBe(1);
  });

  it('exposes the lambda handler and the poller only when they are composed', async () => {
    const withoutConsumer = await appWith([AwsModule.forRoot()]);
    expect(() =>
      withoutConsumer.get(SqsLambdaHandler, { strict: false }),
    ).toThrow();

    const lambdaOnly = await appWith([
      AwsModule.forRoot(),
      SqsConsumerModule.forRoot({
        topology,
        queue: 'reports-work',
        poll: false,
      }),
    ]);
    expect(lambdaOnly.get(SqsLambdaHandler, { strict: false })).toBeInstanceOf(
      SqsLambdaHandler,
    );
    expect(() => lambdaOnly.get(SqsPoller, { strict: false })).toThrow();
  });

  it('publishes through the bus of AwsModule with the physical topic name', async () => {
    const app = await appWith([
      AwsModule.forRoot({ messaging: { topology, source: '/tasks' } }),
    ]);

    await app.get(SnsSqsMessageBus, { strict: false }).publish(TaskClosed, {
      taskId: 't-1',
    });

    expect(fakeSns.sentOf(PublishCommand)[0]?.input).toMatchObject({
      TopicArn: 'arn:aws:sns:us-east-1:000000000000:test-tasks-events',
    });
  });

  it('issues an ElastiCache IAM token signed with the SDK credentials', async () => {
    const app = await appWith([AwsModule.forRoot({ elastiCache: true })]);

    const token = await app
      .get(ElastiCacheIamAuthTokenProvider, { strict: false })
      .token({ userId: 'svc', cacheName: 'cache-1', serverless: true });

    expect(token).toMatch(/^cache-1\/\?/);
    expect(token).toContain(FakeSqsClient.CREDENTIALS.accessKeyId);
  });

  it('refuses a queue that is not in the topology', async () => {
    await expect(
      Promise.resolve().then(() =>
        Test.createTestingModule({
          imports: [
            KernelModule,
            AwsTestPlatformModule,
            AwsModule.forRoot(),
            SqsConsumerModule.forRoot({ topology, queue: 'missing' }),
          ],
        }).compile(),
      ),
    ).rejects.toMatchObject({ code: MessagingErrorCode.UnknownQueue });
  });

  it('refuses consumer settings out of range', async () => {
    await expect(
      Promise.resolve().then(() =>
        Test.createTestingModule({
          imports: [
            KernelModule,
            AwsTestPlatformModule,
            AwsModule.forRoot(),
            SqsConsumerModule.forRoot({
              topology,
              queue: 'reports-work',
              consumer: { batchSize: 0 },
            }),
          ],
        }).compile(),
      ),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
  });
});
