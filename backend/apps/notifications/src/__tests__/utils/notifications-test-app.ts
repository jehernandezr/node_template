import { randomBytes } from 'node:crypto';
import type { ConfigEnv } from '@platform/config';
import { HttpApplicationSetup } from '@platform/http/nest';
import { HttpTestClient } from '@platform/http/test-utils';
import { MigrationTarget } from '@platform/service';
import {
  ServiceBootstrap,
  ServiceMigrator,
  type RunningService,
} from '@platform/service/nest';
import {
  IdentityStub,
  InternalOperationsClient,
  ServiceTestServers,
  type StubMember,
} from '@platform/service/test-utils';
import { MailpitServer } from '../../modules/email/__tests__/utils/index.js';
import { notificationsService } from '../../notifications.service.js';
import { EmailSenderKind } from '../../shared/enums/email-sender-kind.enum.js';

/**
 * Notifications completo sobre PostgreSQL y Valkey reales, con Mailpit como servidor de correo y la API
 * interna de identity respondida por `IdentityStub`. Ubica un tenant en cada shard.
 */
export class NotificationsTestApp {
  static readonly TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
  static readonly FROM = 'no-reply@notifications.test';

  readonly servers = new ServiceTestServers('notifications');
  readonly identity = new IdentityStub();
  readonly mailpit = new MailpitServer();
  private readonly internalSecret = randomBytes(32).toString('base64url');
  private running: RunningService | undefined;

  async start(): Promise<void> {
    await this.servers.start();
    await this.identity.start(this.servers.valkey);
    await this.mailpit.start();
    const env: ConfigEnv = {
      ...this.servers.environment(),
      ...this.identity.environment(),
      NODE_ENV: 'test',
      OTEL_SDK_DISABLED: 'true',
      INTERNAL_API_SHARED_SECRET: this.internalSecret,
      NOTIFICATIONS_EMAIL_SENDER: EmailSenderKind.Smtp,
      SMTP_URL: this.mailpit.smtpUrl(),
      NOTIFICATIONS_FROM_ADDRESS: NotificationsTestApp.FROM,
      NOTIFICATIONS_EMAIL_PEPPER: randomBytes(32).toString('base64url'),
    };
    const migrator = new ServiceMigrator();
    await migrator.run(notificationsService, MigrationTarget.Catalog, { env });
    await this.servers.registerShards();
    await migrator.run(notificationsService, MigrationTarget.Shards, { env });
    await this.servers.placeTenant(NotificationsTestApp.TENANT_A, 0);
    await this.servers.placeTenant(NotificationsTestApp.TENANT_B, 1);
    this.running = await ServiceBootstrap.http(notificationsService, {
      env,
      http: {
        port: 0,
        host: '127.0.0.1',
        configurer: new HttpApplicationSetup(),
      },
    });
  }

  async stop(): Promise<void> {
    await this.running?.stop();
    await this.mailpit.stop();
    await this.identity.stop();
    await this.servers.stop();
  }

  baseUrl(): string {
    return `http://127.0.0.1:${this.service().address?.port ?? 0}`;
  }

  /** Registra al usuario en identity y devuelve su access token. */
  tokenOf(member: StubMember): Promise<string> {
    return this.identity.tokenFor(member);
  }

  async clientOf(member: StubMember): Promise<HttpTestClient> {
    return new HttpTestClient(this.baseUrl(), {
      Authorization: `Bearer ${await this.tokenOf(member)}`,
    });
  }

  anonymous(): HttpTestClient {
    return new HttpTestClient(this.baseUrl());
  }

  internal(): InternalOperationsClient {
    return new InternalOperationsClient(
      'notifications',
      this.baseUrl(),
      this.internalSecret,
    );
  }

  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.service().app.get(token, { strict: false });
  }

  private service(): RunningService {
    if (this.running === undefined) {
      throw new Error('NotificationsTestApp no está iniciada');
    }
    return this.running;
  }
}
