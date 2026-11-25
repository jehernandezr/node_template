import { ConfigSection, envBoolean, envNumber, secret } from '@platform/config';
import { z } from 'zod';

const endpointSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
});

const instanceSchema = z.object({
  primary: endpointSchema,
  replicas: z.array(endpointSchema).default([]),
});

/** `{"<instance>": { primary: {host, port}, replicas: [...] }}` as JSON in a variable. */
const instancesSchema = z
  .string()
  .default('{}')
  .transform((raw, ctx) => {
    try {
      return z.record(z.string(), instanceSchema).parse(JSON.parse(raw));
    } catch {
      ctx.addIssue({
        code: 'custom',
        message:
          'expected a JSON object of instances with primary and replicas',
      });
      return z.NEVER;
    }
  });

export const databaseConfigSchema = z.object({
  DB_USER: z.string().trim().min(1),
  DB_PASSWORD: secret(),
  DB_SSL: envBoolean().default(false),
  DB_POOL_MAX: envNumber({ min: 1, max: 200 }).default(10),
  DB_STATEMENT_TIMEOUT_MS: envNumber({ min: 0 }).default(30_000),
  /** Name of the catalog database. */
  DB_CATALOG_NAME: z.string().trim().min(1).default('catalog'),
  /** Physical instance of the catalog, a key of `DB_INSTANCES`. */
  DB_CATALOG_INSTANCE: z.string().trim().min(1).default('catalog'),
  DB_INSTANCES: instancesSchema,
});

export type DatabaseSettings = z.infer<typeof databaseConfigSchema>;

export const DatabaseConfig = new ConfigSection<DatabaseSettings>(
  'database',
  databaseConfigSchema,
);
