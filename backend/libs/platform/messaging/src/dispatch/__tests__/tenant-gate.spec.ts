import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import { TenantGate } from '../tenant-gate.js';
import type { TenantVerifier } from '../tenant-verifier.js';
import { RecordingTenantVerifier } from './utils/index.js';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

describe('TenantGate', () => {
  it.each([
    [
      'the envelope tenant differs from the expected one',
      { expected: TENANT_A, tenant: TENANT_B },
      'envelope tenant does not match the subscription tenant',
    ],
    [
      'the envelope names no tenant while one is expected',
      { expected: TENANT_A, tenant: undefined },
      'envelope tenant does not match the subscription tenant',
    ],
    [
      'the envelope tenant matches the expected one',
      { expected: TENANT_A, tenant: TENANT_A },
      undefined,
    ],
  ])(
    'compares against the expected tenant when %s',
    async (_label, { expected, tenant }, message) => {
      const gate = new TenantGate(expected, undefined);

      const rejection = await gate.check(
        EnvelopeBuilder.anEnvelope({ tenantid: tenant }),
        { receiveCount: 1 },
      );

      expect(rejection?.message).toBe(message);
    },
  );

  it.each([
    [
      'the verifier accepts the tenant',
      new RecordingTenantVerifier(true),
      undefined,
    ],
    [
      'the verifier refuses the tenant',
      new RecordingTenantVerifier(false),
      'envelope tenant was rejected by the tenant verifier',
    ],
  ])(
    'asks the verifier when %s',
    async (_label, verifier: TenantVerifier, message) => {
      const gate = new TenantGate(undefined, verifier);

      const rejection = await gate.check(
        EnvelopeBuilder.anEnvelope({ tenantid: TENANT_B }),
        { receiveCount: 1 },
      );

      expect(rejection?.message).toBe(message);
    },
  );

  it.each([
    ['no tenant is expected and the envelope names none', undefined, undefined],
    [
      'no tenant is expected but the envelope names one',
      TENANT_A,
      'envelope tenant cannot be verified: configure expectedTenantId or verifyTenant',
    ],
  ])(
    'accepts or refuses without a verifier when %s',
    async (_label, tenant, message) => {
      const gate = new TenantGate(undefined, undefined);

      const rejection = await gate.check(
        EnvelopeBuilder.anEnvelope({ tenantid: tenant }),
        { receiveCount: 1 },
      );

      expect(rejection?.message).toBe(message);
    },
  );

  it('prefers the expected tenant of the delivery over the one of the gate', async () => {
    const gate = new TenantGate(TENANT_A, undefined);

    const rejection = await gate.check(
      EnvelopeBuilder.anEnvelope({ tenantid: TENANT_B }),
      { receiveCount: 1, expectedTenantId: TENANT_B },
    );

    expect(rejection).toBeUndefined();
  });

  it('lets an error from the verifier surface unchanged', async () => {
    const failure = new Error('directory down');
    const gate = new TenantGate(
      undefined,
      new RecordingTenantVerifier(failure),
    );

    await expect(
      gate.check(EnvelopeBuilder.anEnvelope({ tenantid: TENANT_A }), {
        receiveCount: 1,
      }),
    ).rejects.toBe(failure);
  });

  it('gives the verifier the tenant and the envelope', async () => {
    const verifier = new RecordingTenantVerifier(true);
    const envelope = EnvelopeBuilder.anEnvelope({ tenantid: TENANT_A });

    await new TenantGate(undefined, verifier).check(envelope, {
      receiveCount: 1,
    });

    expect(verifier.calls).toEqual([{ tenantId: TENANT_A, envelope }]);
  });
});
