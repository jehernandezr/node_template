import { Global, Module } from '@nestjs/common';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { IdentityMailerKind } from '../../../config/identity-mailer-kind.enum.js';
import { IdentityMailer } from '../domain/identity-mailer.js';
import { SecurityAlerts } from '../domain/security-alerts.js';
import { ConsoleIdentityMailer } from '../infrastructure/console-identity-mailer.js';
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
      ): IdentityMailer => {
        switch (settings.values.IDENTITY_MAILER) {
          case IdentityMailerKind.Memory:
            return memory;
          case IdentityMailerKind.Console:
            return console;
          case IdentityMailerKind.Notifications:
            return notifications;
        }
      },
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
