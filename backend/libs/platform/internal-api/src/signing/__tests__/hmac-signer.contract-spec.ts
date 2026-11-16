import { FixedClock } from '@platform/kernel/test-utils';
import { HmacSigner } from '../hmac-signer.js';
import { runInternalRequestSignerContract } from '../../__tests__/utils/index.js';

runInternalRequestSignerContract(async () => {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  return {
    signer: new HmacSigner('contract-secret-of-the-signer', clock),
    clock,
  };
});
