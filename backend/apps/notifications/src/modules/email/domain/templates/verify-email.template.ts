import { EmailTemplate as EmailTemplateKey } from '@contracts/notifications';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

export class VerifyEmailTemplate extends EmailTemplate {
  readonly key = EmailTemplateKey.VerifyEmail;
  readonly version = 1;
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: 'Confirma tu correo',
      lines: [
        'Hola {display_name}:',
        'Tu código para confirmar el correo es {code}.',
      ],
      action: 'Confirmar correo',
    },
    en: {
      subject: 'Confirm your email',
      lines: [
        'Hi {display_name},',
        'Your code to confirm your email is {code}.',
      ],
      action: 'Confirm email',
    },
  };
}
