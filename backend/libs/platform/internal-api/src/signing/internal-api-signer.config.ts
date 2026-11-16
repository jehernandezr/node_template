import { ConfigSection } from '@platform/config';
import { z } from 'zod';
import { InternalApiSignerKind } from './internal-api-signer-kind.enum.js';

/** Variable que elige el firmador de las llamadas internas de un servicio. */
export const internalApiSignerConfigSchema = z.object({
  INTERNAL_API_SIGNER: z
    .enum(InternalApiSignerKind)
    .default(InternalApiSignerKind.Hmac),
});

/** Configuración validada del firmador de llamadas internas. */
export type InternalApiSignerSettings = z.infer<
  typeof internalApiSignerConfigSchema
>;

/** Sección de configuración del firmador de llamadas internas. */
export const InternalApiSignerConfig =
  new ConfigSection<InternalApiSignerSettings>(
    'internalApiSigner',
    internalApiSignerConfigSchema,
  );
