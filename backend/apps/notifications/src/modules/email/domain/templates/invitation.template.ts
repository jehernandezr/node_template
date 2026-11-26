import {
  EmailTemplate as EmailTemplateKey,
  TemplateParameter,
} from '@contracts/notifications';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

/** Email that invites someone to a tenant with its acceptance link. */
export class InvitationTemplate extends EmailTemplate {
  readonly key = EmailTemplateKey.Invitation;
  readonly version = 1;
  protected override readonly optionalParameters: ReadonlySet<string> = new Set(
    [TemplateParameter.DisplayName],
  );
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: 'Te invitaron a {tenant_name}',
      lines: [
        '{display_name} te invitó a unirte a {tenant_name}.',
        'Tu código de invitación es {code}.',
      ],
      action: 'Aceptar invitación',
    },
    en: {
      subject: 'You were invited to {tenant_name}',
      lines: [
        '{display_name} invited you to join {tenant_name}.',
        'Your invitation code is {code}.',
      ],
      action: 'Accept invitation',
    },
  };
}
