import { DatabaseAuth } from '../../model/database-auth.enum.js';
import { DatabaseConfigKeys } from '../database-config-keys.js';
import { databaseConfigSchema } from '../database.config.js';

describe('DatabaseConfigKeys', () => {
  it('lists every key of the schema for password authentication', () => {
    expect(DatabaseConfigKeys.of(DatabaseAuth.Password)).toEqual(
      Object.keys(databaseConfigSchema.shape).sort(),
    );
  });

  it('leaves out the password for IAM authentication', () => {
    const keys = DatabaseConfigKeys.of(DatabaseAuth.Iam);

    expect(keys).not.toContain('DB_PASSWORD');
    expect(keys).toEqual(
      expect.arrayContaining(['DB_AUTH', 'DB_USER', 'DB_READER_USER']),
    );
  });
});
