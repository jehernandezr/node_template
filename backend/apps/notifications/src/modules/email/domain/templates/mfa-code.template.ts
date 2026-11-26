import { EmailTemplate as EmailTemplateKey } from '@contracts/notifications';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

/** Email with a one-time code for the second factor. */
export class MfaCodeTemplate extends EmailTemplate {
  readonly key = EmailTemplateKey.MfaCode;
  readonly version = 1;
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: 'Tu código de acceso',
      lines: [
        'Tu código de un solo uso es {code}.',
        'Si no intentaste entrar, cambia tu contraseña.',
      ],
    },
    en: {
      subject: 'Your sign-in code',
      lines: [
        'Your one-time code is {code}.',
        'If you did not try to sign in, change your password.',
      ],
    },
  };
}
