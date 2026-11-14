import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { context, trace } from '@opentelemetry/api';
import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { contextFromTraceparent } from '@platform/observability';
import { z } from 'zod';
import {
  DispatchOutcome,
  MessageDispatcher,
} from '../dispatch/message-dispatcher.js';
import { InMemoryProcessedMessageStore } from '../dispatch/processed-message-store.js';
import { MessagingErrorCode } from '../errors/messaging-error.js';
import { topologyFromContracts } from '../topology/contract-topology.js';
import { InMemoryBus } from './in-memory-bus.js';
import { MAX_SEND_DELAY_MS } from './message-bus.js';

/**
 * Réplica de `SessionRevokedEvent` de `@contracts/identity`, declarada con el
 * mismo kit. `@platform/messaging` no puede importar contratos de un servicio
 * (reglas de dependencia del ADR 0015), pero el bus recibe el descriptor de
 * `defineEvent` tal cual, igual que recibiría el de identity.
 */
const SessionRevoked = defineEvent({
  type: 'identity.session.revoked.v1',
  payload: z.object({
    sessionId: z.uuid(),
    userId: z.uuid(),
    reason: z.enum(['logout', 'admin']).default('logout'),
  }),
  description: 'Se revocó una sesión.',
});
const IdentityEvents = defineTopic({
  name: 'identity-events',
  events: [SessionRevoked],
  description: 'Eventos de identity.',
});
const identity = defineServiceContract({
  service: 'identity',
  description: 'Identidad.',
  events: { sessionRevoked: SessionRevoked },
  topics: { identityEvents: IdentityEvents },
});

const LedgerPosted = defineEvent({
  type: 'ledger.entry.posted.v1',
  payload: z.object({ accountId: z.string(), amount: z.number() }),
  description: 'Se registró un asiento.',
});
const LedgerEvents = defineTopic({
  name: 'ledger-events',
  fifo: true,
  events: [LedgerPosted],
  description: 'Asientos en orden por cuenta.',
});
const RecomputeBalance = defineCommand({
  type: 'ledger.balance.recompute.v1',
  payload: z.object({ accountId: z.string() }),
  description: 'Recalcula un saldo.',
});
const ledger = defineServiceContract({
  service: 'ledger',
  description: 'Libro mayor.',
  events: { ledgerPosted: LedgerPosted },
  commands: { recomputeBalance: RecomputeBalance },
  topics: { ledgerEvents: LedgerEvents },
  queues: {
    ledgerProjection: defineQueue({
      name: 'ledger-projection',
      fifo: true,
      commands: [RecomputeBalance],
      subscriptions: [{ topic: LedgerEvents }],
      description: 'Proyección ordenada del libro mayor.',
    }),
  },
});

const Remind = defineCommand({
  type: 'gateway.reminder.send.v1',
  payload: z.object({ userId: z.uuid() }),
  description: 'Envía un recordatorio.',
});
const gateway = defineServiceContract({
  service: 'gateway',
  description: 'Gateway de tiempo real.',
  commands: { remind: Remind },
  queues: {
    gatewayInbox: defineQueue({
      name: 'gateway-inbox',
      commands: [Remind],
      subscriptions: [{ topic: IdentityEvents, events: [SessionRevoked] }],
      retry: { maxAttempts: 2, baseMs: 1_000, maxMs: 1_000 },
      description: 'Sesiones revocadas y recordatorios.',
    }),
  },
});

const SESSION = '01941f29-7c00-7000-8000-000000000001';
const USER = '01941f29-7c00-7000-8000-000000000002';
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const TRACEPARENT = `00-${TRACE_ID}-00f067aa0ba902b7-01`;

function setup(traceparent?: () => string | undefined) {
  let now = 0;
  const topology = topologyFromContracts([identity, gateway, ledger]);
  const bus = new InMemoryBus(topology, {
    source: '/services/identity',
    now: () => new Date(now),
    ...(traceparent ? { traceparent } : {}),
  });
  const dispatcher = new MessageDispatcher({
    consumer: 'gateway-inbox',
    processed: new InMemoryProcessedMessageStore(),
    topology,
  });
  return {
    bus,
    dispatcher,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('InMemoryBus with contracts of the kit', () => {
  it('publishes and consumes an event declared with defineEvent', async () => {
    const { bus, dispatcher } = setup();
    const received: unknown[] = [];
    dispatcher.register(SessionRevoked, (data) => {
      // `data` has the output type of the contract: the default is applied.
      received.push(data.reason);
    });

    const envelope = await bus.publish(SessionRevoked, {
      sessionId: SESSION,
      userId: USER,
    });

    expect(envelope).toMatchObject({
      type: 'identity.session.revoked.v1',
      data: { sessionId: SESSION, userId: USER, reason: 'logout' },
    });
    expect(await bus.drain('gateway-inbox', dispatcher)).toMatchObject({
      processed: 1,
    });
    expect(received).toEqual(['logout']);
  });

  it('takes the retry policy of the consumer queue from the contract', async () => {
    const { bus, dispatcher, advance } = setup();
    dispatcher.register(Remind, () => {
      throw Object.assign(new Error('downstream down'), { retryable: true });
    });
    await bus.send(Remind, { userId: USER });

    expect(await bus.drain('gateway-inbox', dispatcher)).toMatchObject({
      retried: 1,
    });
    advance(1_000);
    // maxAttempts is 2 in the contract: the second failure dead-letters.
    expect(await bus.drain('gateway-inbox', dispatcher)).toMatchObject({
      deadLettered: 1,
    });
  });

  it('dispatcher falls back to the queue retry policy when the transport passes none', async () => {
    const { bus, dispatcher } = setup();
    dispatcher.register(Remind, () => {
      throw Object.assign(new Error('downstream down'), { retryable: true });
    });
    const envelope = await bus.send(Remind, { userId: USER });
    const first = await dispatcher.dispatch(JSON.stringify(envelope), {
      receiveCount: 1,
    });
    expect(first.outcome).toBe(DispatchOutcome.RetryLater);
    const last = await dispatcher.dispatch(JSON.stringify(envelope), {
      receiveCount: 2,
    });
    expect(last.outcome).toBe(DispatchOutcome.DeadLetter);
  });

  it('requires a groupId for FIFO targets and validates it', async () => {
    const { bus } = setup();
    await expect(
      bus.publish(LedgerPosted, { accountId: 'a-1', amount: 10 }),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
    await expect(
      bus.publish(
        LedgerPosted,
        { accountId: 'a-1', amount: 10 },
        { groupId: 'has space' },
      ),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });

    await bus.publish(
      LedgerPosted,
      { accountId: 'a-1', amount: 10 },
      { groupId: 'a-1' },
    );
    expect(bus.pendingCount('ledger-projection')).toBe(1);
  });

  it('caps send delays at 15 minutes and rejects them on FIFO queues', async () => {
    const { bus } = setup();
    await expect(
      bus.send(Remind, { userId: USER }, { delayMs: MAX_SEND_DELAY_MS + 1 }),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
    await expect(
      bus.send(Remind, { userId: USER }, { delayMs: -1 }),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
    await bus.send(Remind, { userId: USER }, { delayMs: MAX_SEND_DELAY_MS });

    await expect(
      bus.send(
        RecomputeBalance,
        { accountId: 'a-1' },
        { groupId: 'a-1', delayMs: 1_000 },
      ),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
  });

  it('rejects an event routed with the wrong kind of contract', async () => {
    const { bus } = setup();
    const Impostor = defineCommand({
      type: 'identity.session.revoked.v1',
      payload: z.object({}),
      description: 'Comando con el tipo de un evento.',
    });
    await expect(bus.send(Impostor, {})).rejects.toMatchObject({
      code: MessagingErrorCode.UnknownRoute,
    });
  });
});

describe('trace propagation through the bus', () => {
  const manager = new AsyncLocalStorageContextManager();

  beforeAll(() => {
    context.setGlobalContextManager(manager.enable());
  });

  afterAll(() => {
    context.disable();
  });

  it('stamps the active traceparent when publishing', async () => {
    const { bus } = setup();
    const envelope = await context.with(
      contextFromTraceparent(TRACEPARENT),
      () => bus.publish(SessionRevoked, { sessionId: SESSION, userId: USER }),
    );
    expect(envelope.traceparent).toBe(TRACEPARENT);
  });

  it('keeps an explicit traceparent', async () => {
    const { bus } = setup(() => TRACEPARENT);
    const other = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const envelope = await bus.publish(
      SessionRevoked,
      { sessionId: SESSION, userId: USER },
      { traceparent: other },
    );
    expect(envelope.traceparent).toBe(other);
  });

  it('runs the handler inside the trace of the envelope', async () => {
    const { bus, dispatcher } = setup(() => TRACEPARENT);
    let seen: string | undefined;
    dispatcher.register(SessionRevoked, () => {
      seen = trace.getActiveSpan()?.spanContext().traceId;
    });
    await bus.publish(SessionRevoked, { sessionId: SESSION, userId: USER });
    await bus.drain('gateway-inbox', dispatcher);
    expect(seen).toBe(TRACE_ID);
  });
});
