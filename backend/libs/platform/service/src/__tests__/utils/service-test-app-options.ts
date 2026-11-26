import type { ConfigEnv } from '@platform/config';
import type { HttpApplicationConfigurer } from '../../nest/bootstrap/http-application-configurer.js';
import type { ServiceDefinition } from '../../service-definition.js';
import type { IdentityStub } from './identity-stub.js';
import type { ServiceTestServers } from './service-test-servers.js';
import type { TestServer } from './test-server.js';

/** What a service's test app is made of. */
export interface ServiceTestAppOptions {
  readonly definition: ServiceDefinition;
  readonly servers: ServiceTestServers;
  /** Sets up the HTTP application as the service's `main.ts` does. */
  readonly configurer: HttpApplicationConfigurer;
  /** Signs tokens and answers identity's internal API; it shares the service's Valkey. */
  readonly identity?: IdentityStub;
  /** Stubs of other services, started after the databases and stopped before them, in reverse order. */
  readonly peers?: readonly TestServer[];
  /** The shard, 0 or 1, of each tenant placed before the service starts. */
  readonly tenants?: Readonly<Record<string, 0 | 1>>;
  /** Base URLs of the stubbed services, added to those of identity; read once the peers are started. */
  readonly peerUrls?: () => Readonly<Record<string, string>>;
  /** Variables of the service itself; read once the peers are started, so they can point at them. */
  readonly environment?: () => ConfigEnv;
}
