import {
  EmailTemplate,
  NotificationsErrorCode,
  SendEmailOperation,
  TemplateParameter,
  type SendEmailInput,
  type SendEmailResult,
} from '@contracts/notifications';
import { OperationHandler, type HandlerResult } from '@platform/internal-api';
import { InProcessInternalApi } from '@platform/internal-api/test-utils';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { IdentityEmailTemplate } from '../../../../shared/enums/identity-email-template.enum.js';
import { NotificationsUnavailableError } from '../../../../shared/errors/notifications-unavailable.error.js';
import { RecordingLogger } from '../../__tests__/utils/index.js';
import { NotificationsIdentityMailer } from '../notifications-identity-mailer.js';

/**
 * Notifications de mentira: guarda cada correo pedido, descarta los dirigidos a una dirección suprimida y
 * falla con los de una plantilla que no conoce.
 */
class RecordingSendEmailHandler extends OperationHandler<
  typeof SendEmailOperation
> {
  static readonly SUPPRESSED = 'rebota@example.com';
  static readonly BROKEN = 'roto@example.com';
  readonly received: SendEmailInput[] = [];

  async handle(input: SendEmailInput): Promise<HandlerResult<SendEmailResult>> {
    if (input.to === RecordingSendEmailHandler.SUPPRESSED) {
      return {
        outcome: CallOutcome.businessError(
          NotificationsErrorCode.EmailRecipientSuppressed,
        ),
      };
    }
    if (input.to === RecordingSendEmailHandler.BROKEN) {
      return {
        outcome: CallOutcome.businessError(
          NotificationsErrorCode.EmailTemplateUnknown,
        ),
      };
    }
    this.received.push(input);
    return { outcome: CallOutcome.success({ messageId: input.messageId }) };
  }
}

const setup = () => {
  const ids = new SequentialIdGenerator();
  const api = new InProcessInternalApi({
    clock: new FixedClock(),
    ids,
    operations: [SendEmailOperation],
  });
  const notifications = new RecordingSendEmailHandler();
  const logger = new RecordingLogger();
  api.router.register(SendEmailOperation, notifications);
  return {
    notifications,
    logger,
    mailer: new NotificationsIdentityMailer(api.client, ids, logger),
  };
};

describe('NotificationsIdentityMailer', () => {
  it('asks notifications for the invitation with its code and tenant name', async () => {
    const { mailer, notifications } = setup();

    await mailer.send({
      template: IdentityEmailTemplate.TenantInvitation,
      to: 'ana@example.com',
      variables: { token: 'inv-7Q2', tenantName: 'Acme' },
    });

    expect(notifications.received).toEqual([
      {
        messageId: expect.any(String),
        template: EmailTemplate.Invitation,
        to: 'ana@example.com',
        parameters: [
          { name: TemplateParameter.Code, value: 'inv-7Q2' },
          { name: TemplateParameter.TenantName, value: 'Acme' },
        ],
      },
    ]);
  });

  it('sends every identity email through a distinct notifications template', async () => {
    const { mailer, notifications } = setup();

    for (const template of Object.values(IdentityEmailTemplate)) {
      await mailer.send({ template, to: 'ana@example.com', variables: {} });
    }

    const templates = notifications.received.map((input) => input.template);
    expect(new Set(templates).size).toBe(
      Object.values(IdentityEmailTemplate).length,
    );
    expect(Object.values(EmailTemplate)).toEqual(
      expect.arrayContaining(templates),
    );
  });

  it('gives each email its own message id so notifications sends both codes', async () => {
    const { mailer, notifications } = setup();

    await mailer.send({
      template: IdentityEmailTemplate.MfaCode,
      to: 'ana@example.com',
      variables: { code: '482913' },
    });
    await mailer.send({
      template: IdentityEmailTemplate.MfaCode,
      to: 'ana@example.com',
      variables: { code: '107364' },
    });

    const [first, second] = notifications.received;
    expect(first?.messageId).not.toBe(second?.messageId);
  });

  it('asks for the email in the language of the user', async () => {
    const { mailer, notifications } = setup();

    await mailer.send({
      template: IdentityEmailTemplate.PasswordReset,
      to: 'bea@example.com',
      locale: 'en',
      variables: { token: 'r3s3t' },
    });

    expect(notifications.received).toEqual([
      expect.objectContaining({ to: 'bea@example.com', locale: 'en' }),
    ]);
  });

  it('leaves the language to notifications when the recipient has no account yet', async () => {
    const { mailer, notifications } = setup();

    await mailer.send({
      template: IdentityEmailTemplate.TenantInvitation,
      to: 'nueva@example.com',
      variables: { token: 'inv-1', tenantName: 'Acme' },
    });

    expect(notifications.received[0]).not.toHaveProperty('locale');
  });

  it('treats a suppressed recipient as a dropped email, without revealing it', async () => {
    const { mailer, logger } = setup();

    await expect(
      mailer.send({
        template: IdentityEmailTemplate.PasswordReset,
        to: RecordingSendEmailHandler.SUPPRESSED,
        variables: { token: 'r3s3t' },
      }),
    ).resolves.toBeUndefined();
    expect(logger.lines).toEqual([
      {
        message: 'identity email dropped: recipient suppressed',
        fields: {
          messageId: expect.any(String),
          template: EmailTemplate.PasswordReset,
        },
      },
    ]);
  });

  it('fails when notifications does not accept the email for any other reason', async () => {
    const { mailer } = setup();

    await expect(
      mailer.send({
        template: IdentityEmailTemplate.PasswordReset,
        to: RecordingSendEmailHandler.BROKEN,
        variables: { token: 'r3s3t' },
      }),
    ).rejects.toBeInstanceOf(NotificationsUnavailableError);
  });
});
