import { Global, Module } from '@nestjs/common';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { IdentityMailer } from '../domain/identity-mailer.js';
import { SecurityAlerts } from '../domain/security-alerts.js';
import { ConsoleIdentityMailer } from '../infrastructure/console-identity-mailer.js';
import { IdentityMailerSelector } from '../infrastructure/identity-mailer-selector.js';
import { MemoryIdentityMailer } from '../infrastructure/memory-identity-mailer.js';
import { NotificationsIdentityMailer } from '../infrastructure/notifications-identity-mailer.js';
import { OutboxSecurityAlerts } from '../infrastructure/outbox-security-alerts.js';

/**
 * Security alerts and transactional email. The mailer is selected with `IDENTITY_MAILER`. It is global because
 * all identity modules raise alerts and send email.
 */
@Global()
@Module({
  providers: [
    MemoryIdentityMailer,
    ConsoleIdentityMailer,
    NotificationsIdentityMailer,
    {
      provide: IdentityMailer,
      useFactory: (
        settings: IdentitySettings,
        memory: MemoryIdentityMailer,
        console: ConsoleIdentityMailer,
        notifications: NotificationsIdentityMailer,
      ): IdentityMailer =>
        new IdentityMailerSelector(memory, console, notifications).select(
          settings.values.IDENTITY_MAILER,
        ),
      inject: [
        IdentitySettings,
        MemoryIdentityMailer,
        ConsoleIdentityMailer,
        NotificationsIdentityMailer,
      ],
    },
    { provide: SecurityAlerts, useClass: OutboxSecurityAlerts },
  ],
  exports: [IdentityMailer, SecurityAlerts, MemoryIdentityMailer],
})
export class AlertsModule {}
