import { ConfigSection } from '@platform/config';
import { z } from 'zod';
import { InternalApiSignerKind } from './internal-api-signer-kind.enum.js';

/** Variable that chooses the signer of a service's internal calls. */
export const internalApiSignerConfigSchema = z.object({
  INTERNAL_API_SIGNER: z
    .enum(InternalApiSignerKind)
    .default(InternalApiSignerKind.Hmac),
});

/** Validated configuration of the internal call signer. */
export type InternalApiSignerSettings = z.infer<
  typeof internalApiSignerConfigSchema
>;

/** Configuration section of the internal call signer. */
export const InternalApiSignerConfig =
  new ConfigSection<InternalApiSignerSettings>(
    'internalApiSigner',
    internalApiSignerConfigSchema,
  );
