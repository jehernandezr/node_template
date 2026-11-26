import { HttpApplicationSetup } from '@platform/http/nest';
import { randomBytes } from 'node:crypto';
import type { HttpTestClient } from '@platform/http/test-utils';
import {
  IdentityStub,
  InternalOperationsClient,
  ServiceTestApp,
  ServiceTestServers,
  type StubMember,
} from '@platform/service/test-utils';
import { MailpitServer } from '../../modules/email/__tests__/utils/index.js';
import { notificationsService } from '../../notifications.service.js';
import { EmailSenderKind } from '../../shared/enums/email-sender-kind.enum.js';

/**
 * Full notifications on real PostgreSQL and Valkey, with Mailpit as the mail server and identity's internal API answered
 * by `IdentityStub`. Places a tenant in each shard.
 */
export class NotificationsTestApp {
  static readonly TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
  static readonly FROM = 'no-reply@notifications.test';

  readonly servers = new ServiceTestServers('notifications');
  readonly identity = new IdentityStub();
  readonly mailpit = new MailpitServer();
  private readonly app = new ServiceTestApp({
    definition: notificationsService,
    servers: this.servers,
    configurer: new HttpApplicationSetup(),
    identity: this.identity,
    peers: [this.mailpit],
    tenants: {
      [NotificationsTestApp.TENANT_A]: 0,
      [NotificationsTestApp.TENANT_B]: 1,
    },
    environment: () => ({
      NOTIFICATIONS_EMAIL_SENDER: EmailSenderKind.Smtp,
      SMTP_URL: this.mailpit.smtpUrl(),
      NOTIFICATIONS_FROM_ADDRESS: NotificationsTestApp.FROM,
      NOTIFICATIONS_EMAIL_PEPPER: randomBytes(32).toString('base64url'),
    }),
  });

  /** Starts the databases, identity, Mailpit and notifications. */
  start(): Promise<void> {
    return this.app.start();
  }

  /** Stops notifications, Mailpit, identity and the databases. */
  stop(): Promise<void> {
    return this.app.stop();
  }

  /** The base URL of the notifications HTTP server. */
  baseUrl(): string {
    return this.app.baseUrl();
  }

  /** Registers the user in identity and returns their access token. */
  tokenOf(member: StubMember): Promise<string> {
    return this.identity.tokenFor(member);
  }

  /** A client that acts as the member. */
  async clientOf(member: StubMember): Promise<HttpTestClient> {
    return this.app.bearer(await this.tokenOf(member));
  }

  /** A client without credentials. */
  anonymous(): HttpTestClient {
    return this.app.client();
  }

  /** A client of the notifications internal API. */
  internal(): InternalOperationsClient {
    return this.app.internal();
  }

  /** A provider of the running application. */
  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.app.get(token);
  }
}
