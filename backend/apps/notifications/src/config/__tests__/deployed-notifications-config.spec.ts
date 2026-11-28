import { randomBytes } from 'node:crypto';
import { DeployEnvironment, type ConfigEnv } from '@platform/config';
import { DeployedServiceEnvironment } from '@platform/config/test-utils';
import { EmailSenderKind } from '../../shared/enums/email-sender-kind.enum.js';
import { PushSenderKind } from '../../shared/enums/push-sender-kind.enum.js';
import { notificationsConfigSchema } from '../notifications.config.js';

const samples: ConfigEnv = {
  NOTIFICATIONS_EMAIL_PEPPER: randomBytes(32).toString('base64url'),
  INTERNAL_API_SHARED_SECRET: randomBytes(32).toString('base64url'),
};

const deployed = (environment: DeployEnvironment): ConfigEnv => ({
  ...samples,
  ...DeployedServiceEnvironment.of('notifications', environment, samples),
});

describe.each(DeployedServiceEnvironment.ENVIRONMENTS)(
  'notifications with its %s values',
  (environment) => {
    it('starts and sends email through SES', () => {
      const parsed = notificationsConfigSchema.safeParse(deployed(environment));

      expect(parsed.error).toBeUndefined();
      expect(parsed.data?.NOTIFICATIONS_EMAIL_SENDER).toBe(EmailSenderKind.Ses);
    });

    it.each([EmailSenderKind.Memory, EmailSenderKind.Smtp])(
      'rejects the %s email sender',
      (sender) => {
        expect(
          notificationsConfigSchema.safeParse({
            ...deployed(environment),
            NOTIFICATIONS_EMAIL_SENDER: sender,
            SMTP_URL: 'smtp://localhost:1025',
          }).success,
        ).toBe(false);
      },
    );
  },
);

describe.each([DeployEnvironment.Staging, DeployEnvironment.Prod])(
  'notifications with its %s values',
  (environment) => {
    it('skips every push', () => {
      expect(
        notificationsConfigSchema.parse(deployed(environment))
          .NOTIFICATIONS_PUSH_SENDER,
      ).toBe(PushSenderKind.None);
    });

    it('rejects the in-memory push sender', () => {
      expect(
        notificationsConfigSchema.safeParse({
          ...deployed(environment),
          NOTIFICATIONS_PUSH_SENDER: PushSenderKind.Memory,
        }).success,
      ).toBe(false);
    });
  },
);
