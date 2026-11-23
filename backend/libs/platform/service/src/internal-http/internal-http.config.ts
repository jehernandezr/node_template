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
 * Variables del transporte HTTP de la API interna. `INTERNAL_API_BASE_URLS` es un mapa JSON de servicio a URL
 * base, por ejemplo `{"identity":"http://identity.internal"}`; un servicio que no llama a otros lo deja vacío.
 */
export const internalHttpConfigSchema = z.object({
  INTERNAL_API_SHARED_SECRET: secret({ minLength: 32 }),
  INTERNAL_API_BASE_URLS: BaseUrlsSchema.default({}),
  ...internalApiSignerConfigSchema.shape,
  ...sigV4ConfigSchema.shape,
});

export type InternalHttpConfig = z.output<typeof internalHttpConfigSchema>;
