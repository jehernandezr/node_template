import { EmailTemplate as EmailTemplateKey } from '@contracts/notifications';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

export class MfaRecoveryTemplate extends EmailTemplate {
  readonly key = EmailTemplateKey.MfaRecovery;
  readonly version = 1;
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: 'Recuperación de tu segundo factor',
      lines: [
        'Pediste entrar sin tu segundo factor.',
        'Podrás confirmarlo desde {available_at} con el código {code}.',
        'Si no fuiste tú, cambia tu contraseña ya.',
      ],
      action: 'Confirmar recuperación',
    },
    en: {
      subject: 'Second factor recovery',
      lines: [
        'You asked to sign in without your second factor.',
        'You can confirm it from {available_at} with the code {code}.',
        'If it was not you, change your password now.',
      ],
      action: 'Confirm recovery',
    },
  };
}
