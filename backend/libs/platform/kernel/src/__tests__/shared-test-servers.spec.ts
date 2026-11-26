import { createRequire } from 'node:module';
import { join } from 'node:path';
import { SharedServerVariable } from './utils/shared-server-variable.enum.js';
import { SharedTestServers } from './utils/shared-test-servers.js';

const published = {
  [SharedServerVariable.PostgresHost]: 'localhost',
  [SharedServerVariable.PostgresPort]: '5433',
  [SharedServerVariable.PostgresUser]: 'test',
  [SharedServerVariable.PostgresPassword]: 'generated-at-setup',
  [SharedServerVariable.ValkeyHost]: 'localhost',
  [SharedServerVariable.ValkeyPort]: '6380',
  [SharedServerVariable.RolePassword]: 'generated-for-roles',
};

describe('SharedTestServers', () => {
  it('reads the servers the global setup published', () => {
    const servers = new SharedTestServers(published);

    expect(servers.postgres()).toEqual({
      host: 'localhost',
      port: 5433,
      username: 'test',
      password: 'generated-at-setup',
      adminDatabase: 'postgres',
    });
    expect(servers.valkey()).toEqual({ host: 'localhost', port: 6380 });
    expect(servers.rolePassword()).toBe('generated-for-roles');
  });

  it('names the missing variable and the preset when the run skipped the global setup', () => {
    const servers = new SharedTestServers({});

    expect(() => servers.valkey()).toThrow(/NT_TEST_VALKEY_HOST.*nx test-int/);
  });

  it('uses the same variable names the global setup writes', () => {
    const load = createRequire(__filename);
    const { JestTestServers } = load(
      join(__dirname, '../../../../../jest.servers.cjs'),
    ) as { JestTestServers: { VARIABLES: Record<string, string> } };

    expect(Object.values(JestTestServers.VARIABLES).sort()).toEqual(
      Object.values(SharedServerVariable).sort(),
    );
  });
});
