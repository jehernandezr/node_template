import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import { OperationMetadata } from '../../contract/operation-metadata.js';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { HmacSigner } from '../../signing/hmac-signer.js';
import { InternalClient } from '../../client/internal-client.js';
import { InternalApiController } from '../internal-api.controller.js';
import { InternalApiModule } from '../internal-api.module.js';
import { InternalTransportKind } from '../internal-transport-kind.enum.js';
import { HttpOutcomeReader } from '../../transport/http-outcome-reader.js';
import { HttpTransport } from '../../transport/http-transport.js';
import { ServiceBaseUrls } from '../../transport/service-base-urls.js';
import {
  CallOutcome,
  CallOutcomeKind,
  RetryAfterParser,
} from '@platform/primitives';
import { FixedClock } from '@platform/kernel/test-utils';
import { SystemClock } from '@platform/kernel';
import { randomBytes } from 'node:crypto';
import { InMemoryProcessedOperationStore } from '../../__tests__/utils/index.js';
import { InternalApiPlatformTestingModule } from './utils/internal-api-platform-testing.module.js';
import { E2eOperations } from './utils/e2e-operations.js';
import { GreeterHandlers } from './utils/greeter-handlers.js';
import { NodeHttpTestServer } from './utils/node-http-test-server.js';

const SECRET = randomBytes(32).toString('hex');
const TRACEPARENT = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
const SKEW_TABLE: Array<[number, Record<string, unknown>]> = [
  [-59_000, { kind: CallOutcomeKind.Success }],
  [59_000, { kind: CallOutcomeKind.Success }],
  [
    -61_000,
    {
      kind: CallOutcomeKind.ProtocolViolation,
      reason: InternalApiReason.Unauthenticated,
    },
  ],
  [
    61_000,
    {
      kind: CallOutcomeKind.ProtocolViolation,
      reason: InternalApiReason.Unauthenticated,
    },
  ],
];

describe('Internal API end to end over HTTP', () => {
  let serverRef: TestingModule;
  let clientRef: TestingModule;
  let server: NodeHttpTestServer;
  let serverUrl: string;
  let handlers: GreeterHandlers;
  let client: InternalClient;

  beforeAll(async () => {
    serverRef = await Test.createTestingModule({
      imports: [
        InternalApiPlatformTestingModule,
        InternalApiModule.forRoot({
          transport: InternalTransportKind.InProcess,
          processedStore: InMemoryProcessedOperationStore,
          operations: [E2eOperations.Greet, E2eOperations.Flaky],
          http: { baseUrls: {}, secret: SECRET },
        }),
      ],
      providers: [GreeterHandlers],
    }).compile();
    await serverRef.init();
    handlers = serverRef.get(GreeterHandlers);
    server = new NodeHttpTestServer(serverRef.get(InternalApiController));
    serverUrl = await server.start();

    clientRef = await Test.createTestingModule({
      imports: [
        InternalApiPlatformTestingModule,
        InternalApiModule.forRoot({
          transport: InternalTransportKind.Http,
          processedStore: InMemoryProcessedOperationStore,
          operations: [],
          remoteOperations: [E2eOperations.Greet, E2eOperations.Flaky],
          http: { baseUrls: { greeter: serverUrl }, secret: SECRET },
        }),
      ],
    }).compile();
    await clientRef.init();
    client = clientRef.get(InternalClient);
  });

  afterAll(async () => {
    await server.stop();
    await clientRef.close();
    await serverRef.close();
  });

  it('calls a remote operation and carries the call metadata to the handler', async () => {
    const outcome = await client.call(
      E2eOperations.Greet,
      { name: 'Ana' },
      {
        idempotencyKey: 'greet-ana-1',
        traceparent: TRACEPARENT,
        tenantId: 'tenant-1',
        actorId: 'actor-1',
      },
    );

    expect(outcome).toEqual(CallOutcome.success({ greeting: 'Hello Ana' }));
    expect(handlers.lastContext).toMatchObject({
      idempotencyKey: 'greet-ana-1',
      traceparent: TRACEPARENT,
      tenantId: 'tenant-1',
      actorId: 'actor-1',
    });
  });

  it('rejects an invalid input on the client without calling the handler', async () => {
    const before = handlers.greetCalls;

    const outcome = await client.callById(
      E2eOperations.Greet.id,
      { name: 5 },
      { idempotencyKey: 'greet-invalid-1' },
    );

    expect(outcome).toMatchObject({
      kind: CallOutcomeKind.BusinessError,
      code: OperationMetadata.INVALID_INPUT_CODE,
    });
    expect(handlers.greetCalls).toBe(before);
  });

  it('rejects a call signed with another secret as unauthenticated', async () => {
    const before = handlers.greetCalls;
    const transport = new HttpTransport(
      new ServiceBaseUrls({ greeter: serverUrl }),
      new HmacSigner('another-secret-of-the-test', new SystemClock()),
      new HttpOutcomeReader(new RetryAfterParser(new SystemClock())),
      globalThis.fetch,
    );

    const outcome = await transport.invoke(
      E2eOperations.Greet.id,
      { name: 'Ana' },
      {
        idempotencyKey: 'greet-forged-1',
        deadline: Date.now() + 5_000,
        timeoutMs: 5_000,
      },
    );

    expect(outcome).toMatchObject({
      kind: CallOutcomeKind.ProtocolViolation,
      reason: InternalApiReason.Unauthenticated,
    });
    expect(handlers.greetCalls).toBe(before);
  });

  it.each(SKEW_TABLE)(
    'accepts or rejects a call whose clock is off by %i ms',
    async (skewMs, expected) => {
      const transport = new HttpTransport(
        new ServiceBaseUrls({ greeter: serverUrl }),
        new HmacSigner(SECRET, new FixedClock(new Date(Date.now() + skewMs))),
        new HttpOutcomeReader(new RetryAfterParser(new SystemClock())),
        globalThis.fetch,
      );

      const outcome = await transport.invoke(
        E2eOperations.Greet.id,
        { name: 'Ana' },
        {
          idempotencyKey: `skew-${skewMs}`,
          deadline: Date.now() + 5_000,
          timeoutMs: 5_000,
        },
      );

      expect(outcome).toMatchObject(expected);
    },
  );

  it('retries a transient failure of an idempotent remote operation until it succeeds', async () => {
    const outcome = await client.call(
      E2eOperations.Flaky,
      {},
      { idempotencyKey: 'flaky-1' },
    );

    expect(outcome).toEqual(CallOutcome.success({ attempts: 2 }));
    expect(handlers.flakyCalls).toBe(2);
  });

  it('runs the handler once for two calls with the same idempotency key', async () => {
    const before = handlers.greetCalls;
    const options = { idempotencyKey: 'bea-1' };

    const first = await client.call(
      E2eOperations.Greet,
      { name: 'Bea' },
      options,
    );
    const second = await client.call(
      E2eOperations.Greet,
      { name: 'Bea' },
      options,
    );

    expect(second).toEqual(first);
    expect(handlers.greetCalls).toBe(before + 1);
  });
});
