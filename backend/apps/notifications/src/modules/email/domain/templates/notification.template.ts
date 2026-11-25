import { NotificationEmailKey } from './notification-email-key.enum.js';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

/** A notification's email: the same title and text as the inbox, already in the user's language. */
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
