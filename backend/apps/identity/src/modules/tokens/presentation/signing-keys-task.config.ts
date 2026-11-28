import { awsConfigSchema } from '@platform/adapters-aws';
import { z } from 'zod';

/**
 * Variables of the `signing-keys` one-off task. It runs before the identity configuration can be valid, because the
 * signing-key secret it fills is still empty, so it reads only these.
 */
export const signingKeysTaskConfigSchema = awsConfigSchema
  .pick({ AWS_REGION: true, AWS_ENDPOINT_URL: true })
  .extend({
    /** ARN of the identity signing-key secret, created empty by the identity `service-base` stack. */
    IDENTITY_SIGNING_KEYS_SECRET_ARN: z
      .string()
      .regex(
        /^arn:[a-z-]+:secretsmanager:[a-z0-9-]+:\d{12}:secret:[^:]+$/,
        'expected a Secrets Manager ARN',
      ),
  });

/** Validated configuration of the `signing-keys` task. */
export type SigningKeysTaskConfig = z.output<
  typeof signingKeysTaskConfigSchema
>;
