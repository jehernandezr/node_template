import { randomBytes } from 'node:crypto';
import { DeployEnvironment, type ConfigEnv } from '@platform/config';
import { EmailSenderKind } from '../../shared/enums/email-sender-kind.enum.js';
import { PushSenderKind } from '../../shared/enums/push-sender-kind.enum.js';
import { notificationsConfigSchema } from '../notifications.config.js';

const environment = (values: ConfigEnv): ConfigEnv => ({
  SERVICE_NAME: 'notifications',
  NOTIFICATIONS_FROM_ADDRESS: 'no-reply@notifications.test',
  NOTIFICATIONS_EMAIL_PEPPER: randomBytes(32).toString('base64url'),
  INTERNAL_API_SHARED_SECRET: randomBytes(32).toString('base64url'),
  ...values,
});

const issues = (values: ConfigEnv): string[] => {
  const result = notificationsConfigSchema.safeParse(environment(values));
  return result.success
    ? []
    : result.error.issues.map((issue) => String(issue.path[0]));
};

const deployed = (
  deployEnvironment: DeployEnvironment,
  values: ConfigEnv,
): ConfigEnv => ({
  DEPLOY_ENVIRONMENT: deployEnvironment,
  NOTIFICATIONS_EMAIL_SENDER: EmailSenderKind.Ses,
  NOTIFICATIONS_PUSH_SENDER: PushSenderKind.None,
  ...values,
});

describe('notificationsConfigSchema', () => {
  it('accepts every sender locally, smtp with its URL', () => {
    expect(
      issues({
        NOTIFICATIONS_EMAIL_SENDER: EmailSenderKind.Smtp,
        SMTP_URL: 'smtp://localhost:1025',
        NOTIFICATIONS_PUSH_SENDER: PushSenderKind.Memory,
      }),
    ).toEqual([]);
    expect(
      issues({ NOTIFICATIONS_EMAIL_SENDER: EmailSenderKind.Smtp }),
    ).toEqual(['SMTP_URL']);
  });

  it.each([
    DeployEnvironment.Dev,
    DeployEnvironment.Staging,
    DeployEnvironment.Prod,
  ])('sends email only through SES in %s', (deployEnvironment) => {
    for (const sender of [EmailSenderKind.Memory, EmailSenderKind.Smtp]) {
      expect(
        issues(
          deployed(deployEnvironment, {
            NOTIFICATIONS_EMAIL_SENDER: sender,
            SMTP_URL: 'smtp://localhost:1025',
          }),
        ),
      ).toEqual(['NOTIFICATIONS_EMAIL_SENDER']);
    }
    expect(issues(deployed(deployEnvironment, {}))).toEqual([]);
  });

  it('keeps pushes in memory or skips them in dev', () => {
    for (const sender of [PushSenderKind.Memory, PushSenderKind.None]) {
      expect(
        issues(
          deployed(DeployEnvironment.Dev, {
            NOTIFICATIONS_PUSH_SENDER: sender,
          }),
        ),
      ).toEqual([]);
    }
  });

  it.each([DeployEnvironment.Staging, DeployEnvironment.Prod])(
    'skips every push in %s',
    (deployEnvironment) => {
      expect(
        issues(
          deployed(deployEnvironment, {
            NOTIFICATIONS_PUSH_SENDER: PushSenderKind.Memory,
          }),
        ),
      ).toEqual(['NOTIFICATIONS_PUSH_SENDER']);
    },
  );
});
