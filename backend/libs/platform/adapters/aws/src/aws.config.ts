import { ConfigSection } from '@platform/config';
import { z } from 'zod';

/** Account LocalStack uses by default. */
export const LOCALSTACK_ACCOUNT_ID = '000000000000';

/**
 * Variables of the AWS adapter. Credentials do not go here: the SDK takes them
 * from the default chain (Lambda role or Fargate task role; locally,
 * the LocalStack variables).
 */
export const awsConfigSchema = z.object({
  /** AWS region, for example `us-east-1`. */
  AWS_REGION: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(-[a-z]+)+-\d+$/, 'invalid AWS region'),
  /**
   * Endpoint for all services, only for LocalStack (`http://localhost:4566`).
   * Left empty in AWS. It is the same variable the SDK reads.
   */
  AWS_ENDPOINT_URL: z.url().optional(),
  /**
   * Account that owns the topics; builds the ARN without calling STS. In LocalStack it is
   * {@link LOCALSTACK_ACCOUNT_ID}. No default value, so a deployment
   * does not publish to the wrong account.
   */
  AWS_ACCOUNT_ID: z.string().regex(/^\d{12}$/, 'the account has 12 digits'),
  /**
   * Prefix of the physical names of topics and queues: the `name_prefix` of the
   * Terraform `messaging` module (`<prefix>-<logical name>[.fifo]`).
   */
  MESSAGING_NAME_PREFIX: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'lowercase letters, digits and hyphens',
    ),
});

/** Validated configuration of the AWS adapter. */
export type AwsSettings = z.infer<typeof awsConfigSchema>;

/** Configuration section that `AwsModule` validates at startup. */
export const AwsConfig = new ConfigSection<AwsSettings>('aws', awsConfigSchema);
