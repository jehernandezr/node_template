import type { ConfigEnv } from '@platform/config';
import { ServiceTestServers } from '@platform/service/test-utils';
import { IdentityTestEnvironment } from './identity-test-environment.js';

/** Real PostgreSQL and Valkey for identity, with their test configuration. */
export class IdentityTestServers extends ServiceTestServers {
  constructor() {
    super('identity');
  }

  override environment(): ConfigEnv {
    return IdentityTestEnvironment.build(super.environment());
  }
}
