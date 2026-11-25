import { z } from 'zod';
import { sigV4ConfigSchema } from '@platform/adapters-aws';
import { secret } from '@platform/config';
import { internalApiSignerConfigSchema } from '@platform/internal-api';

const BaseUrlsSchema = z
  .string()
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'INTERNAL_API_BASE_URLS no es JSON',
      });
      return z.NEVER;
    }
  })
  .pipe(z.record(z.string().min(1), z.url()));

/**
 * Variables of the internal API HTTP transport. `INTERNAL_API_BASE_URLS` is a JSON map from service to base
 * URL, for example `{"identity":"http://identity.internal"}`; a service that does not call others leaves it empty.
 */
export const internalHttpConfigSchema = z.object({
  INTERNAL_API_SHARED_SECRET: secret({ minLength: 32 }),
  INTERNAL_API_BASE_URLS: BaseUrlsSchema.default({}),
  ...internalApiSignerConfigSchema.shape,
  ...sigV4ConfigSchema.shape,
});

export type InternalHttpConfig = z.output<typeof internalHttpConfigSchema>;
