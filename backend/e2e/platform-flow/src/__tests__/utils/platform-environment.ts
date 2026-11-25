import { randomBytes } from 'node:crypto';
import { FeatureFlag } from '@contracts/identity';
import { IdentityTestEnvironment } from '@apps/identity/test-utils';
import type { ConfigEnv } from '@platform/config';
import { ProvisionedService } from '@platform/service/test-utils';
import type { PlatformServers } from './platform-servers.js';
import { PlatformService } from './platform-service.enum.js';

/**
 * The configuration of each service: its databases, the shared Valkey, the same internal API secret for all, the
 * URLs of the others, token verification against the identity JWKS and the two shard groups, with which
 * identity records in the other services where it placed a tenant and to which it can move it.
 */
export class PlatformEnvironment {
  /** One group per shard: `group-0` leads to the first shard of each service and `group-1` to the second. */
  static readonly MOVE_GROUPS = ProvisionedService.GROUPS;
  private static readonly TRIAL_DAYS = 14;
  private static readonly GRACE_DAYS = 7;

  private readonly internalSecret = randomBytes(32).toString('base64url');
  private readonly identityBase: ConfigEnv;

  constructor(
    private readonly servers: PlatformServers,
    private readonly databases: Readonly<
      Record<PlatformService, ProvisionedService>
    >,
    private readonly ports: Readonly<Record<PlatformService, number>>,
  ) {
    this.identityBase = IdentityTestEnvironment.build();
  }

  of(service: PlatformService): ConfigEnv {
    const shared = this.sharedOf(service);
    switch (service) {
      case PlatformService.Identity:
        return {
          ...this.identityBase,
          ...shared,
          SERVICE_NAME: PlatformService.Identity,
          // Each test user declares its IP in `X-Forwarded-For`, so the per-IP limit is not shared among all of them.
          TRUST_PROXY_HOPS: '1',
          FEATURE_FLAGS: JSON.stringify([
            {
              flag: FeatureFlag.NewReports,
              enabled: true,
              rolloutPercent: 100,
            },
          ]),
        };
      case PlatformService.Notifications:
        return {
          ...shared,
          NOTIFICATIONS_FROM_ADDRESS: 'alerts@example.com',
          NOTIFICATIONS_EMAIL_PEPPER: randomBytes(32).toString('base64url'),
        };
      case PlatformService.Billing:
        return {
          ...shared,
          BILLING_TRIAL_DAYS: String(PlatformEnvironment.TRIAL_DAYS),
          BILLING_GRACE_DAYS: String(PlatformEnvironment.GRACE_DAYS),
        };
      default:
        return shared;
    }
  }

  portOf(service: PlatformService): number {
    return this.ports[service];
  }

  baseUrlOf(service: PlatformService): string {
    return this.urlOf(this.portOf(service));
  }

  private sharedOf(service: PlatformService): ConfigEnv {
    const identityUrl = this.baseUrlOf(PlatformService.Identity);
    return {
      ...this.databases[service].environment(),
      ...this.servers.valkeyEnvironment(service),
      NODE_ENV: 'test',
      OTEL_SDK_DISABLED: 'true',
      INTERNAL_API_SHARED_SECRET: this.internalSecret,
      INTERNAL_API_BASE_URLS: JSON.stringify(this.baseUrls()),
      AUTH_ISSUER: String(this.identityBase['IDENTITY_ISSUER']),
      AUTH_JWKS_URL: `${identityUrl}/v1/auth/jwks`,
    };
  }

  private baseUrls(): Record<PlatformService, string> {
    return Object.fromEntries(
      Object.values(PlatformService).map((service) => [
        service,
        this.baseUrlOf(service),
      ]),
    ) as Record<PlatformService, string>;
  }

  private urlOf(port: number): string {
    return `http://127.0.0.1:${port}`;
  }
}
