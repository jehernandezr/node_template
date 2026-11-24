import { z } from 'zod';
import { serviceConfigSchema } from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';

/** Configuración de __name__. Las librerías leen las suyas (base de datos, Valkey, auth) por su sección. */
export const __nameCamel__ConfigSchema = serviceConfigSchema.extend({
  ...internalHttpConfigSchema.shape,
});

export type __Name__Config = z.output<typeof __nameCamel__ConfigSchema>;
