import { NotificationEmailKey } from './notification-email-key.enum.js';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

/** El correo de una notificación: el mismo título y texto que la bandeja, ya en el idioma del usuario. */
export class NotificationTemplate extends EmailTemplate {
  readonly key = NotificationEmailKey.Notification;
  readonly version = 1;
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: '{title}',
      lines: ['{body}'],
      action: 'Ver en la aplicación',
    },
    en: { subject: '{title}', lines: ['{body}'], action: 'Open the app' },
  };
}
