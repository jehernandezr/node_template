import {
  EmailTemplate as EmailTemplateKey,
  TemplateParameter,
} from '@contracts/notifications';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

export class EmailChangeTemplate extends EmailTemplate {
  readonly key = EmailTemplateKey.EmailChange;
  readonly version = 1;
  protected override readonly optionalParameters: ReadonlySet<string> = new Set(
    [TemplateParameter.DisplayName],
  );
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: 'Confirma tu nuevo correo',
      lines: [
        'Hola {display_name}:',
        'Tu código para confirmar el cambio es {code}.',
      ],
      action: 'Confirmar cambio',
    },
    en: {
      subject: 'Confirm your new email',
      lines: [
        'Hi {display_name},',
        'Your code to confirm the change is {code}.',
      ],
      action: 'Confirm change',
    },
  };
}
