import { FixedClock } from '@platform/kernel/test-utils';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { InternalHeader } from '../../transport/internal-header.enum.js';
import { HmacInternalCallAuthenticator } from '../hmac-internal-call-authenticator.js';
import { HmacSigner } from '../../signing/hmac-signer.js';
import type { SignableRequest } from '../signable-request.js';

const SECRET = 'test-secret-of-the-authenticator';
const PATH = '/internal/operations/billing.invoices.create.v1';
const BODY = { input: { amount: 1 } };
const START = new Date('2026-01-01T00:00:00.000Z');

/** Petición firmada por un firmador con el reloj dado, como la envía el transporte. */
async function signed(
  clock: FixedClock,
  overrides: { secret?: string; body?: unknown; path?: string } = {},
): Promise<SignableRequest> {
  const headers: Record<string, string> = {
    [InternalHeader.IdempotencyKey]: 'key-1',
    [InternalHeader.Deadline]: '1767225600000',
    [InternalHeader.TenantId]: 'tenant-1',
  };
  const signer = new HmacSigner(overrides.secret ?? SECRET, clock);
  const signature = await signer.sign({
    method: 'POST',
    path: PATH,
    body: BODY,
    headers,
  });
  return {
    method: 'POST',
    path: overrides.path ?? PATH,
    body: overrides.body ?? BODY,
    headers: { ...headers, ...signature },
  };
}

describe('HmacInternalCallAuthenticator', () => {
  it('accepts a request signed with the same secret and clock', async () => {
    const clock = new FixedClock(START);
    const authenticator = new HmacInternalCallAuthenticator(SECRET, clock);

    await expect(
      authenticator.authenticate(await signed(clock)),
    ).resolves.toBeUndefined();
  });

  it.each([
    [
      'another secret',
      async (clock: FixedClock) => signed(clock, { secret: 'other-secret' }),
    ],
    [
      'an altered body',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        return { ...request, body: { input: { amount: 999 } } };
      },
    ],
    [
      'an altered tenant header',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        return {
          ...request,
          headers: {
            ...request.headers,
            [InternalHeader.TenantId]: 'tenant-2',
          },
        };
      },
    ],
    [
      'an altered path',
      async (clock: FixedClock) =>
        signed(clock, {
          path: '/internal/operations/billing.invoices.delete.v1',
        }),
    ],
    [
      'no signature',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        const headers = { ...request.headers };
        delete headers[InternalHeader.Signature];
        return { ...request, headers };
      },
    ],
    [
      'no timestamp',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        const headers = { ...request.headers };
        delete headers[InternalHeader.Timestamp];
        return { ...request, headers };
      },
    ],
    [
      'a timestamp that is not a number',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        return {
          ...request,
          headers: { ...request.headers, [InternalHeader.Timestamp]: 'abc' },
        };
      },
    ],
    [
      'a signature of another length',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        return {
          ...request,
          headers: { ...request.headers, [InternalHeader.Signature]: 'ab' },
        };
      },
    ],
    [
      'a body that cannot be signed',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        return { ...request, body: undefined };
      },
    ],
    [
      'a timestamp 61 seconds in the past',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        clock.advance(61_000);
        return request;
      },
    ],
    [
      'a timestamp 61 seconds in the future',
      async (clock: FixedClock) => {
        const request = await signed(clock);
        clock.advance(-61_000);
        return request;
      },
    ],
  ])('rejects a request with %s', async (_label, build) => {
    const clock = new FixedClock(START);
    const authenticator = new HmacInternalCallAuthenticator(SECRET, clock);
    const request = await build(clock);

    await expect(authenticator.authenticate(request)).rejects.toMatchObject({
      code: InternalApiErrorCode.Unauthenticated,
    });
  });

  it.each([
    ['a timestamp 59 seconds in the past', -59_000],
    ['a timestamp 59 seconds in the future', 59_000],
  ])('accepts a request with %s', async (_label, shiftMs) => {
    const clock = new FixedClock(START);
    const authenticator = new HmacInternalCallAuthenticator(SECRET, clock);
    const request = await signed(clock);
    clock.advance(shiftMs);

    await expect(authenticator.authenticate(request)).resolves.toBeUndefined();
  });

  it('gives the same message for two different reasons to reject', async () => {
    const clock = new FixedClock(START);
    const authenticator = new HmacInternalCallAuthenticator(SECRET, clock);
    const wrongSecret = await signed(clock, { secret: 'other-secret' });
    const missingSignature = await signed(clock);
    const headers = { ...missingSignature.headers };
    delete headers[InternalHeader.Signature];

    const first = authenticator.authenticate(wrongSecret);
    const second = authenticator.authenticate({ ...missingSignature, headers });

    await expect(first).rejects.toThrow(
      'The internal call is not authenticated',
    );
    await expect(second).rejects.toThrow(
      'The internal call is not authenticated',
    );
  });
});
