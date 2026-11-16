import { ConfigSection } from '@platform/config';
import { z } from 'zod';
import { SigV4Service } from './sigv4-service.enum.js';

/**
 * Variables de la firma SigV4 de las llamadas internas. La región es la de
 * `AWS_REGION` y las credenciales salen de la cadena por defecto del SDK, así
 * que aquí solo se elige a qué servicio de AWS se firma.
 */
export const sigV4ConfigSchema = z.object({
  INTERNAL_API_SIGV4_SERVICE: z
    .enum(SigV4Service)
    .default(SigV4Service.ExecuteApi),
});

/** Configuración validada de la firma SigV4. */
export type SigV4Settings = z.infer<typeof sigV4ConfigSchema>;

/** Sección de configuración de la firma SigV4. */
export const SigV4Config = new ConfigSection<SigV4Settings>(
  'sigv4',
  sigV4ConfigSchema,
);
