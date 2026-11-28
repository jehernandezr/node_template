import { databaseConfigSchema } from '../database.config.js';

const VALID_INSTANCES = JSON.stringify({
  'db-1': {
    primary: { host: 'primary.local', port: 5432 },
    replicas: [{ host: 'replica.local', port: 5433 }],
  },
});

describe('databaseConfigSchema', () => {
  describe('when the environment is valid', () => {
    it('parses the instances and applies the defaults', () => {
      const settings = databaseConfigSchema.parse({
        DB_USER: 'app',
        DB_PASSWORD: 'database-secret',
        DB_CATALOG_NAME: 'svc_catalog',
        DB_INSTANCES: VALID_INSTANCES,
      });

      expect(settings.DB_INSTANCES).toEqual({
        'db-1': {
          primary: { host: 'primary.local', port: 5432 },
          replicas: [{ host: 'replica.local', port: 5433 }],
        },
      });
      expect(settings.DB_CATALOG_NAME).toBe('svc_catalog');
      expect(settings.DB_SSL).toBe(false);
    });
  });

  describe('when the catalog name is missing', () => {
    it('fails instead of connecting to a database nobody creates', () => {
      const result = databaseConfigSchema.safeParse({
        DB_USER: 'app',
        DB_PASSWORD: 'database-secret',
        DB_INSTANCES: VALID_INSTANCES,
      });

      expect(result.error?.issues.map((issue) => issue.path)).toEqual([
        ['DB_CATALOG_NAME'],
      ]);
    });
  });

  describe('when the instances JSON is invalid', () => {
    it('fails without echoing the password', () => {
      const result = databaseConfigSchema.safeParse({
        DB_USER: 'app',
        DB_PASSWORD: 'database-secret',
        DB_INSTANCES: '{"db-1": ',
      });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).not.toContain('database-secret');
    });
  });

  describe('when the password is parsed', () => {
    it('reveals its value only through reveal()', () => {
      const settings = databaseConfigSchema.parse({
        DB_USER: 'app',
        DB_PASSWORD: 'database-secret',
        DB_CATALOG_NAME: 'svc_catalog',
      });

      expect(settings.DB_PASSWORD.reveal()).toBe('database-secret');
      expect(String(settings.DB_PASSWORD)).not.toContain('database-secret');
    });
  });
});
