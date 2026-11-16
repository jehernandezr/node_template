import { FixedClock } from '@platform/kernel/test-utils';
import { InternalHeader } from '../../transport/internal-header.enum.js';
import { HmacInternalCallSigner } from '../hmac-internal-call-signer.js';
import type { SignableRequest } from '../signable-request.js';

const SECRET = 'test-secret-of-the-signer';

function request(body: unknown): SignableRequest {
  return {
    method: 'POST',
    path: '/internal/operations/billing.invoices.create.v1',
    body,
    headers: { [InternalHeader.IdempotencyKey]: 'key-1' },
  };
}

describe('HmacInternalCallSigner', () => {
  it('returns the timestamp and a hex signature', async () => {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const signer = new HmacInternalCallSigner(SECRET, clock);

    const headers = await signer.sign(request({ input: { amount: 1 } }));

    expect(headers).toEqual({
      [InternalHeader.Timestamp]: String(clock.now().getTime()),
      [InternalHeader.Signature]: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('gives the same signature for the same request at the same instant', async () => {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const signer = new HmacInternalCallSigner(SECRET, clock);

    const first = await signer.sign(request({ input: { amount: 1 } }));
    const second = await signer.sign(request({ input: { amount: 1 } }));

    expect(second).toEqual(first);
  });

  it('changes the signature when the body changes', async () => {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const signer = new HmacInternalCallSigner(SECRET, clock);

    const original = await signer.sign(request({ input: { amount: 1 } }));
    const altered = await signer.sign(request({ input: { amount: 2 } }));

    expect(altered[InternalHeader.Signature]).not.toBe(
      original[InternalHeader.Signature],
    );
  });
});
