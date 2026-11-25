import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FixedClock } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { HmacInternalCallAuthenticator } from '../../auth/hmac-internal-call-authenticator.js';
import { HmacSigner } from '../../signing/hmac-signer.js';
import { CallMetaReader } from '../../transport/call-meta-reader.js';
import { InternalApiRoute } from '../../transport/internal-api-route.js';
import { InternalHeader } from '../../transport/internal-header.enum.js';
import { InternalApiController } from '../internal-api.controller.js';
import { StubInternalRouter } from './utils/stub-internal-router.js';

const SECRET = 'test-secret-of-the-controller';
const OPERATION_ID = 'billing.invoices.create.v1';
const DEADLINE = '1767225600000';

/** Headers of a complete call, as the transport sends them. */
function baseHeaders(): Record<string, string> {
  return {
    [InternalHeader.IdempotencyKey]: 'key-1',
    [InternalHeader.Deadline]: DEADLINE,
    [InternalHeader.TimeoutMs]: '5000',
    [InternalHeader.TenantId]: 'tenant-1',
  };
}

describe('InternalApiController', () => {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));

  function setup(secret = SECRET) {
    const router = new StubInternalRouter();
    const controller = new InternalApiController(
      router,
      new HmacInternalCallAuthenticator(SECRET, clock),
      new CallMetaReader(),
    );
    const signer = new HmacSigner(secret, clock);
    /** Signs the given headers and body, as the other service's transport would. */
    async function signedHeaders(body: unknown, headers = baseHeaders()) {
      const signature = await signer.sign({
        method: 'POST',
        path: InternalApiRoute.pathOf(OPERATION_ID),
        body,
        headers,
      });
      return { ...headers, ...signature };
    }
    return { router, controller, signedHeaders };
  }

  it('passes a valid request to the router and answers its outcome', async () => {
    const { router, controller, signedHeaders } = setup();
    const body = { input: { amount: 3 } };
    router.respondWith(CallOutcome.success({ id: 'i-1' }));
    const headers = await signedHeaders(body, {
      ...baseHeaders(),
      [InternalHeader.Traceparent]:
        '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      [InternalHeader.ActorId]: 'actor-1',
    });

    await expect(
      controller.handle(OPERATION_ID, body, headers),
    ).resolves.toEqual({ outcome: CallOutcome.success({ id: 'i-1' }) });
    expect(router.calls).toEqual([
      {
        operationId: OPERATION_ID,
        input: { amount: 3 },
        meta: {
          idempotencyKey: 'key-1',
          deadline: Number(DEADLINE),
          timeoutMs: 5000,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          tenantId: 'tenant-1',
          actorId: 'actor-1',
        },
      },
    ]);
  });

  it('rejects a request signed with another secret without calling the router', async () => {
    const { router, controller, signedHeaders } = setup('other-secret');
    const body = { input: { amount: 3 } };
    const headers = await signedHeaders(body);

    await expect(
      controller.handle(OPERATION_ID, body, headers),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(router.calls).toHaveLength(0);
  });

  it('rejects a request without idempotency key with a bad request', async () => {
    const { router, controller, signedHeaders } = setup();
    const body = { input: { amount: 3 } };
    const headers = baseHeaders();
    delete headers[InternalHeader.IdempotencyKey];

    await expect(
      controller.handle(OPERATION_ID, body, await signedHeaders(body, headers)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(router.calls).toHaveLength(0);
  });

  it('rejects a body that is a text with a bad request', async () => {
    const { controller, signedHeaders } = setup();
    const body = 'texto';

    await expect(
      controller.handle(OPERATION_ID, body, await signedHeaders(body)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a body that is an array with a bad request', async () => {
    const { controller, signedHeaders } = setup();
    const body = [1];

    await expect(
      controller.handle(OPERATION_ID, body, await signedHeaders(body)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('answers a transient failure with its retry hint and without its cause', async () => {
    const { router, controller, signedHeaders } = setup();
    const body = { input: {} };
    router.respondWith(
      CallOutcome.transientFailure('busy', {
        retryAfterMs: 50,
        cause: new Error('internal detail'),
      }),
    );

    await expect(
      controller.handle(OPERATION_ID, body, await signedHeaders(body)),
    ).resolves.toEqual({
      outcome: CallOutcome.transientFailure('busy', { retryAfterMs: 50 }),
    });
  });

  it('answers an uncertain outcome without its cause', async () => {
    const { router, controller, signedHeaders } = setup();
    const body = { input: {} };
    router.respondWith(
      CallOutcome.uncertain('timeout', new Error('internal detail')),
    );

    await expect(
      controller.handle(OPERATION_ID, body, await signedHeaders(body)),
    ).resolves.toEqual({ outcome: CallOutcome.uncertain('timeout') });
  });
});
