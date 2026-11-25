import { z } from 'zod';
import { serviceConfigSchema } from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';

/** __name__ configuration. The libraries read their own (database, Valkey, auth) by their section. */
export const __nameCamel__ConfigSchema = serviceConfigSchema.extend({
  ...internalHttpConfigSchema.shape,
});

export type __Name__Config = z.output<typeof __nameCamel__ConfigSchema>;
