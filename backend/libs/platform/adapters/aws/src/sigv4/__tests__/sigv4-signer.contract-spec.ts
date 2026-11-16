import { runInternalRequestSignerContract } from '@platform/internal-api/test-utils';
import { FixedClock } from '@platform/kernel/test-utils';
import { StaticCredentialsProvider } from '../../__tests__/utils/index.js';
import { SigV4Signer } from '../sigv4-signer.js';
import { SigV4Service } from '../sigv4-service.enum.js';

runInternalRequestSignerContract(async () => {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  return {
    signer: new SigV4Signer(
      { region: 'us-east-1', service: SigV4Service.ExecuteApi },
      new StaticCredentialsProvider({
        accessKeyId: 'contract-access-key-id',
        secretAccessKey: 'contract-secret-access-key',
      }),
      clock,
    ),
    clock,
  };
});
