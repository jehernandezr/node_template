import type { FixedClock } from '@platform/kernel/test-utils';
import type { SignableRequest } from '../../auth/signable-request.js';
import type { InternalRequestSigner } from '../../signing/internal-request-signer.js';
import { InternalHeader } from '../../transport/internal-header.enum.js';

/** Signer under test and the clock that controls its instants. */
export interface SignerContractSubject {
  readonly signer: InternalRequestSigner;
  readonly clock: FixedClock;
}

/**
 * Pins what any `InternalRequestSigner` must satisfy, whether HMAC or SigV4:
 * lowercase headers, a stable signature for a request, dependence on the
 * body, the identity, the operation and the instant, and no mutation
 * of the request.
 */
export function runInternalRequestSignerContract(
  create: () => Promise<SignerContractSubject>,
): void {
  describe('InternalRequestSigner contract', () => {
    function baseRequest(
      overrides: Partial<SignableRequest> = {},
    ): SignableRequest {
      return {
        method: 'POST',
        path: '/internal/operations/billing.invoices.create.v1',
        baseUrl: 'https://billing.internal.example.test',
        body: { input: { amount: 1 } },
        headers: {
          [InternalHeader.TenantId]: 'tenant-1',
          [InternalHeader.IdempotencyKey]: 'key-1',
        },
        ...overrides,
      };
    }

    function deepFreeze<T>(value: T): T {
      if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
      }
      return value;
    }

    it('returns lowercase header names with non-empty string values', async () => {
      const { signer } = await create();

      const headers = await signer.sign(baseRequest());

      expect(Object.keys(headers).length).toBeGreaterThan(0);
      for (const [name, value] of Object.entries(headers)) {
        expect(name).toBe(name.toLowerCase());
        expect(typeof value).toBe('string');
        expect(value).not.toBe('');
      }
    });

    it('gives the same headers for the same request at the same instant', async () => {
      const { signer } = await create();

      const first = await signer.sign(baseRequest());
      const second = await signer.sign(baseRequest());

      expect(second).toEqual(first);
    });

    it('gives different headers for a different body', async () => {
      const { signer } = await create();

      const original = await signer.sign(baseRequest());
      const altered = await signer.sign(
        baseRequest({ body: { input: { amount: 2 } } }),
      );

      expect(JSON.stringify(altered)).not.toBe(JSON.stringify(original));
    });

    it('gives different headers for a different tenant', async () => {
      const { signer } = await create();

      const original = await signer.sign(baseRequest());
      const altered = await signer.sign(
        baseRequest({
          headers: {
            [InternalHeader.TenantId]: 'tenant-2',
            [InternalHeader.IdempotencyKey]: 'key-1',
          },
        }),
      );

      expect(JSON.stringify(altered)).not.toBe(JSON.stringify(original));
    });

    it('gives different headers for a different method or path', async () => {
      const { signer } = await create();

      const original = await signer.sign(baseRequest());
      const otherMethod = await signer.sign(baseRequest({ method: 'PUT' }));
      const otherPath = await signer.sign(
        baseRequest({
          path: '/internal/operations/billing.invoices.cancel.v1',
        }),
      );

      expect(JSON.stringify(otherMethod)).not.toBe(JSON.stringify(original));
      expect(JSON.stringify(otherPath)).not.toBe(JSON.stringify(original));
    });

    it('gives different headers once the clock advances', async () => {
      const { signer, clock } = await create();

      const before = await signer.sign(baseRequest());
      clock.advance(1000);
      const after = await signer.sign(baseRequest());

      expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
    });

    it('does not modify a frozen request', async () => {
      const { signer } = await create();
      const request = deepFreeze(baseRequest());

      await expect(signer.sign(request)).resolves.toEqual(expect.any(Object));
      expect(request.headers).toEqual({
        [InternalHeader.TenantId]: 'tenant-1',
        [InternalHeader.IdempotencyKey]: 'key-1',
      });
      expect(request.body).toEqual({ input: { amount: 1 } });
    });

    it('does not repeat any header already present in the request', async () => {
      const { signer } = await create();
      const request = baseRequest();

      const headers = await signer.sign(request);

      for (const name of Object.keys(request.headers)) {
        expect(headers).not.toHaveProperty(name);
      }
    });
  });
}
