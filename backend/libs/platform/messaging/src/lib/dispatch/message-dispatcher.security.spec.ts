import { z } from 'zod';
import { EventContract } from '../contracts/message-contract.js';
import {
  createEnvelope,
  MAX_ENVELOPE_BYTES,
  MAX_ENVELOPE_SOURCE_LENGTH,
  MAX_ENVELOPE_SUBJECT_LENGTH,
  MAX_ENVELOPE_TENANT_ID_LENGTH,
  MAX_ENVELOPE_TYPE_LENGTH,
} from '../envelope/message-envelope.js';
import { MessagingErrorCode } from '../errors/messaging-error.js';
import { RetryPolicy } from '../topology/retry-policy.js';
import {
  DispatchOutcome,
  MessageDispatcher,
  type MessageDispatcherOptions,
} from './message-dispatcher.js';
import { InMemoryProcessedMessageStore } from './processed-message-store.js';

const dataSchema = z.object({ id: z.string() });

class TaskUpdated extends EventContract<{ id: string }> {
  readonly type = 'tasks.task.updated.v1';
  readonly schema = dataSchema;
}

const policy = RetryPolicy.exponential({
  maxAttempts: 3,
  baseMs: 100,
  maxMs: 1_000,
  jitter: false,
});

function envelopeFor(
  tenantId: string | undefined,
  data: unknown = { id: 't1' },
): Record<string, unknown> {
  return createEnvelope(
    { type: 'tasks.task.updated.v1', source: '/test', data, tenantId },
    { newId: () => 'msg-1' },
  ) as unknown as Record<string, unknown>;
}

function setup(extra: Partial<MessageDispatcherOptions> = {}) {
  const handler = jest.fn();
  const dispatcher = new MessageDispatcher({
    consumer: 'notifications',
    processed: new InMemoryProcessedMessageStore(),
    ...extra,
  });
  dispatcher.register(new TaskUpdated(), handler);
  return { dispatcher, handler };
}

describe('MessageDispatcher tenant verification', () => {
  it('rejects an envelope whose tenant differs from the subscription tenant', async () => {
    const { dispatcher, handler } = setup();
    expect(
      await dispatcher.dispatch(envelopeFor('tenant-b'), {
        receiveCount: 1,
        expectedTenantId: 'tenant-a',
      }),
    ).toEqual({
      outcome: DispatchOutcome.DeadLetter,
      id: 'msg-1',
      error: 'envelope tenant does not match the subscription tenant',
      code: MessagingErrorCode.TenantMismatch,
    });
    // A missing tenant does not match either.
    expect(
      await dispatcher.dispatch(envelopeFor(undefined), {
        receiveCount: 1,
        expectedTenantId: 'tenant-a',
      }),
    ).toMatchObject({ code: MessagingErrorCode.TenantMismatch });
    expect(handler).not.toHaveBeenCalled();
  });

  it('processes an envelope of the expected tenant, from the delivery or the dispatcher', async () => {
    const perDelivery = setup();
    expect(
      (
        await perDelivery.dispatcher.dispatch(envelopeFor('tenant-a'), {
          receiveCount: 1,
          expectedTenantId: 'tenant-a',
        })
      ).outcome,
    ).toBe(DispatchOutcome.Processed);

    const singleTenant = setup({ expectedTenantId: 'tenant-a' });
    expect(
      (
        await singleTenant.dispatcher.dispatch(envelopeFor('tenant-a'), {
          receiveCount: 1,
        })
      ).outcome,
    ).toBe(DispatchOutcome.Processed);
    expect(
      (
        await singleTenant.dispatcher.dispatch(envelopeFor('tenant-z'), {
          receiveCount: 1,
        })
      ).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('asks the verifier and rejects the tenants it refuses', async () => {
    const verifyTenant = jest.fn(
      (tenantId: string | undefined) => tenantId === 'tenant-a',
    );
    const { dispatcher, handler } = setup({ verifyTenant });

    expect(
      (await dispatcher.dispatch(envelopeFor('tenant-a'), { receiveCount: 1 }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);
    expect(
      await dispatcher.dispatch(envelopeFor('tenant-x', { id: 't2' }), {
        receiveCount: 1,
      }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.TenantMismatch,
    });
    expect(verifyTenant).toHaveBeenCalledWith(
      'tenant-x',
      expect.objectContaining({ id: 'msg-1' }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries when the verifier itself fails', async () => {
    const { dispatcher, handler } = setup({
      verifyTenant: () => Promise.reject(new Error('directory down')),
    });
    expect(
      await dispatcher.dispatch(envelopeFor('tenant-a'), {
        receiveCount: 1,
        retryPolicy: policy,
      }),
    ).toMatchObject({ outcome: DispatchOutcome.RetryLater });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not trust an unverifiable envelope tenant by default', async () => {
    const { dispatcher, handler } = setup();
    expect(
      await dispatcher.dispatch(envelopeFor('tenant-a'), { receiveCount: 1 }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.TenantMismatch,
    });
    // Without a tenant claim there is nothing to verify.
    expect(
      (await dispatcher.dispatch(envelopeFor(undefined), { receiveCount: 1 }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('keeps the deprecated opt-out that trusts the envelope tenant', async () => {
    const { dispatcher } = setup({ trustEnvelopeTenant: true });
    expect(
      (await dispatcher.dispatch(envelopeFor('tenant-a'), { receiveCount: 1 }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);
  });

  it('verifies the tenant before opening the context', async () => {
    const runInContext = jest.fn((_envelope, fn: () => Promise<void>) => fn());
    const { dispatcher } = setup({ runInContext });
    await dispatcher.dispatch(envelopeFor('tenant-b'), {
      receiveCount: 1,
      expectedTenantId: 'tenant-a',
    });
    expect(runInContext).not.toHaveBeenCalled();
  });
});

describe('MessageDispatcher input bounds', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects an oversized envelope before parsing its data', async () => {
    const parse = jest.spyOn(dataSchema, 'safeParse');
    const { dispatcher, handler } = setup();
    const result = await dispatcher.dispatch(
      envelopeFor(undefined, { id: 'x'.repeat(MAX_ENVELOPE_BYTES) }),
      { receiveCount: 1 },
    );
    expect(result).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.PayloadTooLarge,
    });
    expect(parse).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects an oversized raw body before JSON.parse', async () => {
    const { dispatcher } = setup();
    const body = JSON.stringify(
      envelopeFor(undefined, { id: 'é'.repeat(MAX_ENVELOPE_BYTES / 2) }),
    );
    const jsonParse = jest.spyOn(JSON, 'parse');
    expect(await dispatcher.dispatch(body, { receiveCount: 1 })).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.PayloadTooLarge,
    });
    expect(jsonParse).not.toHaveBeenCalled();
  });

  it('accepts a raw JSON body and dead-letters one that is not JSON', async () => {
    const { dispatcher, handler } = setup();
    expect(
      (
        await dispatcher.dispatch(JSON.stringify(envelopeFor(undefined)), {
          receiveCount: 1,
        })
      ).outcome,
    ).toBe(DispatchOutcome.Processed);
    expect(handler).toHaveBeenCalledWith(
      { id: 't1' },
      expect.objectContaining({ id: 'msg-1' }),
    );
    expect(
      await dispatcher.dispatch('{not json', { receiveCount: 1 }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.InvalidEnvelope,
    });
  });

  it.each([
    ['type', 'type', 'x'.repeat(MAX_ENVELOPE_TYPE_LENGTH + 1)],
    ['source', 'source', 'x'.repeat(MAX_ENVELOPE_SOURCE_LENGTH + 1)],
    ['subject', 'subject', 'x'.repeat(MAX_ENVELOPE_SUBJECT_LENGTH + 1)],
    ['tenant', 'tenantid', 'x'.repeat(MAX_ENVELOPE_TENANT_ID_LENGTH + 1)],
    ['traceparent', 'traceparent', `00-${'a'.repeat(4_000)}`],
  ])(
    'dead-letters an envelope with an oversized %s',
    async (_label, field, value) => {
      const { dispatcher, handler } = setup({ trustEnvelopeTenant: true });
      expect(
        await dispatcher.dispatch(
          { ...envelopeFor(undefined), [field]: value },
          { receiveCount: 1 },
        ),
      ).toMatchObject({
        outcome: DispatchOutcome.DeadLetter,
        code: MessagingErrorCode.InvalidEnvelope,
      });
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it('dead-letters a value that cannot be serialized instead of throwing', async () => {
    const { dispatcher } = setup();
    const cyclic: Record<string, unknown> = envelopeFor(undefined);
    cyclic['self'] = cyclic;
    expect(
      await dispatcher.dispatch(cyclic, { receiveCount: 1 }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.InvalidEnvelope,
    });
  });
});
