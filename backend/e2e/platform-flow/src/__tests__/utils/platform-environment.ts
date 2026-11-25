import { randomBytes } from 'node:crypto';
import { FeatureFlag } from '@contracts/identity';
import { IdentityTestEnvironment } from '@apps/identity/test-utils';
import type { ConfigEnv } from '@platform/config';
import { ProvisionedService } from '@platform/service/test-utils';
import type { PlatformServers } from './platform-servers.js';
import { PlatformService } from './platform-service.enum.js';

/**
 * La configuración de cada servicio: sus bases, el Valkey común, el mismo secreto de la API interna para todos, las
 * URLs de los demás, la verificación de tokens contra el JWKS de identity y los dos grupos de shards, con los que
 * identity anota en los demás servicios dónde ubicó un tenant y a los que se lo puede trasladar.
 */
export class PlatformEnvironment {
  /** Un grupo por shard: `group-0` lleva al primer shard de cada servicio y `group-1` al segundo. */
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
          // Cada usuario de prueba declara su IP en `X-Forwarded-For`, así el límite por IP no se reparte entre todos.
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
          NOTIFICATIONS_FROM_ADDRESS: 'avisos@example.com',
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
