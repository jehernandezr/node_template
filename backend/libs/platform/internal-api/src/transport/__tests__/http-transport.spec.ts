import { FixedClock } from '@platform/kernel/test-utils';
import {
  CallOutcome,
  CallOutcomeKind,
  RetryAfterParser,
} from '@platform/primitives';
import { HmacInternalCallAuthenticator } from '../../auth/hmac-internal-call-authenticator.js';
import { HmacInternalCallSigner } from '../../auth/hmac-internal-call-signer.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { HttpOutcomeReader } from '../http-outcome-reader.js';
import { HttpTransport } from '../http-transport.js';
import { InternalHeader } from '../internal-header.enum.js';
import { ServiceBaseUrls } from '../service-base-urls.js';
import { FakeFetcher } from './utils/fake-fetcher.js';

const SECRET = 'test-secret-of-the-http-transport';
const OPERATION_ID = 'billing.invoices.create.v1';
const URL_TEXT =
  'http://billing.test:3000/internal/operations/billing.invoices.create.v1';

describe('HttpTransport', () => {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const meta = {
    idempotencyKey: 'key-1',
    timeoutMs: 5000,
    deadline: clock.now().getTime() + 5000,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    tenantId: 'tenant-1',
    actorId: 'actor-1',
  };
  const minimalMeta = {
    idempotencyKey: 'key-2',
    timeoutMs: 5000,
    deadline: clock.now().getTime() + 5000,
  };

  function build(fetcher: FakeFetcher): HttpTransport {
    return new HttpTransport(
      new ServiceBaseUrls({ billing: 'http://billing.test:3000/' }),
      new HmacInternalCallSigner(SECRET, clock),
      new HttpOutcomeReader(new RetryAfterParser(clock)),
      fetcher.fetch,
    );
  }

  it('posts the input to the operation route of the owning service', async () => {
    const fetcher = new FakeFetcher();
    fetcher.respondWith(new Response(null, { status: 503 }));

    await build(fetcher).invoke(OPERATION_ID, { amount: 3 }, meta);

    expect(fetcher.requests[0]).toMatchObject({
      url: URL_TEXT,
      method: 'POST',
      body: { input: { amount: 3 } },
    });
  });

  it('sends the full call metadata as headers', async () => {
    const fetcher = new FakeFetcher();
    fetcher.respondWith(new Response(null, { status: 503 }));

    await build(fetcher).invoke(OPERATION_ID, {}, meta);

    expect(fetcher.requests[0]?.headers).toMatchObject({
      'content-type': 'application/json',
      [InternalHeader.IdempotencyKey]: 'key-1',
      [InternalHeader.Deadline]: String(meta.deadline),
      [InternalHeader.TimeoutMs]: '5000',
      [InternalHeader.Traceparent]: meta.traceparent,
      [InternalHeader.TenantId]: 'tenant-1',
      [InternalHeader.ActorId]: 'actor-1',
    });
  });

  it('leaves out the optional headers when the metadata does not carry them', async () => {
    const fetcher = new FakeFetcher();
    fetcher.respondWith(new Response(null, { status: 503 }));

    await build(fetcher).invoke(OPERATION_ID, {}, minimalMeta);

    const headers = fetcher.requests[0]?.headers ?? {};
    expect(headers).not.toHaveProperty(InternalHeader.TenantId);
    expect(headers).not.toHaveProperty(InternalHeader.ActorId);
    expect(headers).not.toHaveProperty(InternalHeader.Traceparent);
  });

  it('sends a signature that the authenticator of the receiving service accepts', async () => {
    const fetcher = new FakeFetcher();
    fetcher.respondWith(new Response(null, { status: 503 }));

    await build(fetcher).invoke(OPERATION_ID, { amount: 3 }, meta);

    const sent = fetcher.requests[0];
    const authenticator = new HmacInternalCallAuthenticator(SECRET, clock);
    await expect(
      authenticator.authenticate({
        method: 'POST',
        path: new URL(sent?.url ?? '').pathname,
        body: sent?.body,
        headers: sent?.headers ?? {},
      }),
    ).resolves.toBeUndefined();
  });

  it('passes the call signal to the fetcher', async () => {
    const fetcher = new FakeFetcher();
    fetcher.respondWith(new Response(null, { status: 503 }));
    const controller = new AbortController();

    await build(fetcher).invoke(
      OPERATION_ID,
      {},
      {
        ...meta,
        signal: controller.signal,
      },
    );

    expect(fetcher.requests[0]?.signal).toBe(controller.signal);
  });

  it('returns the outcome read from the response', async () => {
    const fetcher = new FakeFetcher();
    fetcher.respondWith(
      new Response(
        JSON.stringify({ outcome: CallOutcome.success({ id: 'i-1' }) }),
        {
          status: 200,
        },
      ),
    );

    const outcome = await build(fetcher).invoke(OPERATION_ID, {}, meta);

    expect(outcome).toEqual({
      kind: CallOutcomeKind.Success,
      value: { id: 'i-1' },
    });
  });

  it('rejects a service without a base URL without calling the fetcher', async () => {
    const fetcher = new FakeFetcher();
    const transport = new HttpTransport(
      new ServiceBaseUrls({ identity: 'http://identity.test:3000' }),
      new HmacInternalCallSigner(SECRET, clock),
      new HttpOutcomeReader(new RetryAfterParser(clock)),
      fetcher.fetch,
    );

    await expect(
      transport.invoke(OPERATION_ID, {}, meta),
    ).rejects.toMatchObject({
      code: InternalApiErrorCode.UnknownService,
    });
    expect(fetcher.requests).toHaveLength(0);
  });

  it('propagates a network error of the fetcher', async () => {
    const fetcher = new FakeFetcher();
    fetcher.failWith(new TypeError('fetch failed'));

    await expect(
      build(fetcher).invoke(OPERATION_ID, {}, meta),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
