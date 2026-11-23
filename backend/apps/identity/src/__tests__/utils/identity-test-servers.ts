import type { ConfigEnv } from '@platform/config';
import { ServiceTestServers } from '@platform/service/test-utils';
import { IdentityTestEnvironment } from './identity-test-environment.js';

/** PostgreSQL y Valkey reales para identity, con su configuración de prueba. */
export class IdentityTestServers extends ServiceTestServers {
  constructor() {
    super('identity');
  }

  override environment(): ConfigEnv {
    return IdentityTestEnvironment.build(super.environment());
  }
}
