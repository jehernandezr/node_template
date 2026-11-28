import { AwsClientFactory } from '@platform/adapters-aws';
import { ConfigValidationError } from '@platform/config';
import { SigningKeysTask } from '../signing-keys.task.js';

describe('SigningKeysTask', () => {
  it('needs the region and the ARN of the signing-key secret', async () => {
    const running = new SigningKeysTask(new AwsClientFactory()).run({
      IDENTITY_SIGNING_KEYS_SECRET_ARN: 'signing-keys',
    });

    await expect(running).rejects.toBeInstanceOf(ConfigValidationError);
    await expect(running).rejects.toMatchObject({
      issues: [
        expect.objectContaining({ path: 'AWS_REGION' }),
        expect.objectContaining({ path: 'IDENTITY_SIGNING_KEYS_SECRET_ARN' }),
      ],
    });
  });
});
