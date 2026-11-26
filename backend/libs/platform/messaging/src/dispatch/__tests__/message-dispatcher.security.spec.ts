import { TestDispatcherParts } from '../../__tests__/utils/index.js';
import { SystemRandomSource, SystemClock } from '@platform/kernel';
import { defineEvent } from '@contracts/platform';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { z } from 'zod';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { EnvelopeLimits } from '../../envelope/envelope-limits.js';
import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import { MessageDispatcher } from '../message-dispatcher.js';
import { DispatchOutcome } from '../dispatch-outcome.enum.js';
import type { MessageDispatcherOptions } from '../message-dispatcher-options.js';
import { InMemoryProcessedMessageStore } from '../../__tests__/utils/in-memory-processed-message-store.js';
import {
  RecordingMessageHandler,
  RecordingRunInContext,
  RecordingTenantVerifier,
} from './utils/index.js';

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({ id: z.string() }),
  description: 'Test message.',
});

const policy = new RetryPolicy(3, 100, 1_000, BackoffStrategy.None);

function envelopeFor(
  tenantId: string | undefined,
  data: unknown = { id: 't1' },
): Record<string, unknown> {
  return EnvelopeBuilder.anEnvelope({
    type: 'tasks.task.updated.v1',
    data,
    ...(tenantId === undefined ? {} : { tenantid: tenantId }),
  }) as unknown as Record<string, unknown>;
}

function setup(extra: Partial<MessageDispatcherOptions> = {}) {
  const handler = new RecordingMessageHandler();
  const dispatcher = new MessageDispatcher(
    {
      clock: new SystemClock(),
      consumer: 'notifications',
      processed: new InMemoryProcessedMessageStore(),
      ...extra,
    },
    TestDispatcherParts.with(new SystemRandomSource()),
  );
  dispatcher.register(TaskUpdated, handler.handle);
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
    // An envelope without a tenant does not match either.
    expect(
      await dispatcher.dispatch(envelopeFor(undefined), {
        receiveCount: 1,
        expectedTenantId: 'tenant-a',
      }),
    ).toMatchObject({ code: MessagingErrorCode.TenantMismatch });
    expect(handler.calls).toEqual([]);
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

  it('asks the verifier and dead-letters a tenant it refuses', async () => {
    const verifier = new RecordingTenantVerifier(false);
    const { dispatcher, handler } = setup({ verifyTenant: verifier });

    expect(
      await dispatcher.dispatch(envelopeFor('tenant-x', { id: 't2' }), {
        receiveCount: 1,
      }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.TenantMismatch,
    });
    expect(verifier.calls).toEqual([
      expect.objectContaining({ tenantId: 'tenant-x' }),
    ]);
    expect(handler.calls).toEqual([]);
  });

  it('processes a tenant the verifier accepts', async () => {
    const { dispatcher, handler } = setup({
      verifyTenant: new RecordingTenantVerifier(true),
    });

    expect(
      (await dispatcher.dispatch(envelopeFor('tenant-a'), { receiveCount: 1 }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);
    expect(handler.calls).toHaveLength(1);
  });

  it('retries when the verifier itself fails', async () => {
    const { dispatcher, handler } = setup({
      verifyTenant: new RecordingTenantVerifier(new Error('directory down')),
    });
    expect(
      await dispatcher.dispatch(envelopeFor('tenant-a'), {
        receiveCount: 1,
        retryPolicy: policy,
      }),
    ).toMatchObject({ outcome: DispatchOutcome.RetryLater });
    expect(handler.calls).toEqual([]);
  });

  it('does not trust an unverifiable envelope tenant by default', async () => {
    const { dispatcher, handler } = setup();
    expect(
      await dispatcher.dispatch(envelopeFor('tenant-a'), { receiveCount: 1 }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.TenantMismatch,
    });
    // Without a tenant in the envelope there is nothing to verify.
    expect(
      (await dispatcher.dispatch(envelopeFor(undefined), { receiveCount: 1 }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);
    expect(handler.calls).toHaveLength(1);
  });

  it('verifies the tenant before opening the context', async () => {
    const runInContext = new RecordingRunInContext();
    const { dispatcher } = setup({ runInContext: runInContext.run });
    await dispatcher.dispatch(envelopeFor('tenant-b'), {
      receiveCount: 1,
      expectedTenantId: 'tenant-a',
    });
    expect(runInContext.events).toEqual([]);
  });
});

describe('MessageDispatcher input bounds', () => {
  it('rejects an oversized envelope before validating its data', async () => {
    const { dispatcher, handler } = setup();
    const result = await dispatcher.dispatch(
      envelopeFor(undefined, {
        id: 123,
        pad: 'x'.repeat(EnvelopeLimits.MAX_BYTES),
      }),
      { receiveCount: 1 },
    );
    expect(result).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.PayloadTooLarge,
    });
    expect(handler.calls).toEqual([]);
  });

  it('rejects an oversized raw body that is also not JSON with PayloadTooLarge', async () => {
    const { dispatcher } = setup();
    const body = `{${'é'.repeat(EnvelopeLimits.MAX_BYTES / 2)}`;

    expect(await dispatcher.dispatch(body, { receiveCount: 1 })).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.PayloadTooLarge,
    });
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
    expect(handler.calls[0]?.data).toEqual({ id: 't1' });
    expect(
      await dispatcher.dispatch('{not json', { receiveCount: 1 }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.InvalidEnvelope,
    });
  });

  it.each([
    ['type', 'type', 'x'.repeat(EnvelopeLimits.MAX_TYPE_LENGTH + 1)],
    ['source', 'source', 'x'.repeat(EnvelopeLimits.MAX_SOURCE_LENGTH + 1)],
    ['subject', 'subject', 'x'.repeat(EnvelopeLimits.MAX_SUBJECT_LENGTH + 1)],
    ['tenant', 'tenantid', 'x'.repeat(EnvelopeLimits.MAX_TENANT_ID_LENGTH + 1)],
    ['traceparent', 'traceparent', `00-${'a'.repeat(4_000)}`],
  ])(
    'dead-letters an envelope with an oversized %s',
    async (_label, field, value) => {
      const { dispatcher, handler } = setup();
      expect(
        await dispatcher.dispatch(
          { ...envelopeFor(undefined), [field]: value },
          { receiveCount: 1 },
        ),
      ).toMatchObject({
        outcome: DispatchOutcome.DeadLetter,
        code: MessagingErrorCode.InvalidEnvelope,
      });
      expect(handler.calls).toEqual([]);
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
