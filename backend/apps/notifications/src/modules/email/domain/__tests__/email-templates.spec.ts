import {
  EmailTemplate,
  NotificationsErrorCode,
  TemplateParameter,
} from '@contracts/notifications';
import { EmailTemplates } from '../templates/email-templates.js';
import { NotificationEmailKey } from '../templates/notification-email-key.enum.js';

const templates = new EmailTemplates();

describe('EmailTemplates', () => {
  it('has a template for every transactional email of the contract', () => {
    expect(
      Object.values(EmailTemplate).map((key) => templates.find(key)?.key),
    ).toEqual(Object.values(EmailTemplate));
  });

  it('fills the data in the language of the user and adds the link as an action', () => {
    const rendered = templates.find(EmailTemplate.Invitation)?.render(
      new Map([
        [TemplateParameter.DisplayName, 'Ana'],
        [TemplateParameter.TenantName, 'Acme'],
        [TemplateParameter.Code, 'inv-7781'],
        [TemplateParameter.Link, 'https://app.example.com/invitations/abc'],
      ]),
      'en-US',
    );

    expect(rendered?.subject).toBe('You were invited to Acme');
    expect(rendered?.text).toContain(
      'Accept invitation: https://app.example.com/invitations/abc',
    );
    expect(rendered?.html).toContain(
      '<a href="https://app.example.com/invitations/abc">',
    );
  });

  it('escapes the data in the HTML body and keeps it plain in the text body', () => {
    const rendered = templates.find(NotificationEmailKey.Notification)?.render(
      new Map([
        ['title', 'Aviso'],
        ['body', '<script>alert(1)</script>'],
      ]),
      'es',
    );

    expect(rendered?.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered?.html).not.toContain('<script>');
    expect(rendered?.text).toContain('<script>alert(1)</script>');
  });

  it.each([
    [EmailTemplate.MfaCode, new Map<string, string>()],
    [
      EmailTemplate.Invitation,
      new Map([[TemplateParameter.TenantName, 'Acme']]),
    ],
    [EmailTemplate.MfaRecovery, new Map([[TemplateParameter.Code, '482913']])],
  ])(
    'refuses to render %s without a required data instead of sending it incomplete',
    (key, parameters) => {
      expect(() => templates.find(key)?.render(parameters, 'es')).toThrow(
        expect.objectContaining({
          code: NotificationsErrorCode.EmailTemplateParameterMissing,
        }),
      );
    },
  );

  it('leaves out the line of an optional data that did not arrive', () => {
    const rendered = templates
      .find(EmailTemplate.PasswordReset)
      ?.render(new Map([[TemplateParameter.Code, 'r3s3t']]), 'es');

    expect(rendered?.text).toBe(
      [
        'Pediste cambiar tu contraseña.',
        'Tu código para cambiarla es r3s3t y vence pronto.',
      ].join('\n\n'),
    );
    expect(rendered?.html).not.toContain('{display_name}');
  });

  it('falls back to Spanish for a language without texts', () => {
    const rendered = templates
      .find(EmailTemplate.MfaCode)
      ?.render(new Map([[TemplateParameter.Code, '123456']]), 'pt-BR');

    expect(rendered?.subject).toBe('Tu código de acceso');
    expect(rendered?.text).toContain('123456');
  });
});
