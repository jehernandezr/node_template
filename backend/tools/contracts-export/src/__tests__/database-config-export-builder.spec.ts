import { DatabaseAuth, DatabaseConfigKeys } from '@platform/persistence/config';
import { DatabaseConfigExportBuilder } from '../database-config-export-builder.js';
import { DATABASE_CONFIG_FORMAT_VERSION } from '../export-constants.js';

describe('DatabaseConfigExportBuilder', () => {
  it('writes the keys of each database authentication', () => {
    expect(new DatabaseConfigExportBuilder().build()).toEqual({
      formatVersion: DATABASE_CONFIG_FORMAT_VERSION,
      keys: {
        password: DatabaseConfigKeys.of(DatabaseAuth.Password),
        iam: DatabaseConfigKeys.of(DatabaseAuth.Iam),
      },
    });
  });
});
