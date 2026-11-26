/** Variables through which the Jest `globalSetup` (`backend/jest.servers.cjs`) publishes the shared servers. */
export enum SharedServerVariable {
  PostgresHost = 'NT_TEST_POSTGRES_HOST',
  PostgresPort = 'NT_TEST_POSTGRES_PORT',
  PostgresUser = 'NT_TEST_POSTGRES_USER',
  PostgresPassword = 'NT_TEST_POSTGRES_PASSWORD',
  ValkeyHost = 'NT_TEST_VALKEY_HOST',
  ValkeyPort = 'NT_TEST_VALKEY_PORT',
  RolePassword = 'NT_TEST_ROLE_PASSWORD',
}
