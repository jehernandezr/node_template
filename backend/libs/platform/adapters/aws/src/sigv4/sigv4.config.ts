import { ConfigSection } from '@platform/config';
import { z } from 'zod';
import { SigV4Service } from './sigv4-service.enum.js';

/**
 * Variables of the SigV4 signature of internal calls. The region is the one in
 * `AWS_REGION` and the credentials come from the SDK default chain, so
 * here only the AWS service to sign for is chosen.
 */
export const sigV4ConfigSchema = z.object({
  INTERNAL_API_SIGV4_SERVICE: z
    .enum(SigV4Service)
    .default(SigV4Service.ExecuteApi),
});

/** Validated configuration of the SigV4 signature. */
export type SigV4Settings = z.infer<typeof sigV4ConfigSchema>;

/** Configuration section of the SigV4 signature. */
export const SigV4Config = new ConfigSection<SigV4Settings>(
  'sigv4',
  sigV4ConfigSchema,
);
