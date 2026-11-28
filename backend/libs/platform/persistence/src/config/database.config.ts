import { ConfigSection, envBoolean, envNumber, secret } from '@platform/config';
import { z } from 'zod';
import { DatabaseAuth } from '../model/database-auth.enum.js';

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

export const databaseConfigSchema = z
  .object({
    /** `password` presents `DB_PASSWORD`; `iam` signs a fresh token per connection (ADR 0041). */
    DB_AUTH: z.enum(DatabaseAuth).default(DatabaseAuth.Password),
    /** User of the primary: the service's app role, or its owner role in the migrate task. */
    DB_USER: z.string().trim().min(1),
    /** User of the read replicas, `<service>_reader` in AWS. Without it the replicas use `DB_USER`. */
    DB_READER_USER: z.string().trim().min(1).optional(),
    /** Required with `DB_AUTH=password`, unused with `iam`. */
    DB_PASSWORD: secret().optional(),
    DB_SSL: envBoolean().default(false),
    DB_POOL_MAX: envNumber({ min: 1, max: 200 }).default(10),
    DB_STATEMENT_TIMEOUT_MS: envNumber({ min: 0 }).default(30_000),
    /** Time a new connection has to reach a node before it fails, so a shard that does not answer frees its caller. */
    DB_CONNECT_TIMEOUT_MS: envNumber({ min: 1 }).default(5_000),
    /** Name of the service's catalog database, `<service>_catalog`. */
    DB_CATALOG_NAME: z.string().trim().min(1),
    /** Physical instance of the catalog, a key of `DB_INSTANCES`. */
    DB_CATALOG_INSTANCE: z.string().trim().min(1).default('catalog'),
    DB_INSTANCES: instancesSchema,
  })
  .superRefine((settings, ctx) => {
    if (
      settings.DB_AUTH === DatabaseAuth.Password &&
      settings.DB_PASSWORD === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['DB_PASSWORD'],
        message: 'DB_PASSWORD is required with DB_AUTH=password',
      });
    }
  });

export type DatabaseSettings = z.infer<typeof databaseConfigSchema>;

export const DatabaseConfig = new ConfigSection<DatabaseSettings>(
  'database',
  databaseConfigSchema,
);
