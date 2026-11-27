import { z } from 'zod';
import {
  DeployEnvironment,
  EnvironmentAllowance,
  envNumber,
  secret,
  serviceConfigSchema,
} from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';
import { NotificationsDefaults } from '../shared/constants/notifications-defaults.constants.js';
import { EmailSenderKind } from '../shared/enums/email-sender-kind.enum.js';
import { PushSenderKind } from '../shared/enums/push-sender-kind.enum.js';
import { RealtimeHost } from '../shared/enums/realtime-host.enum.js';

/** Outside `local`, email goes out through SES only: `smtp` neither authenticates nor encrypts (ADR 0046). */
const EMAIL_SENDER = new EnvironmentAllowance<EmailSenderKind>(
  'NOTIFICATIONS_EMAIL_SENDER',
  {
    [DeployEnvironment.Dev]: [EmailSenderKind.Ses],
    [DeployEnvironment.Staging]: [EmailSenderKind.Ses],
    [DeployEnvironment.Prod]: [EmailSenderKind.Ses],
  },
);

/** `dev` may still keep pushes in memory; `staging` and `prod` skip them until a real provider lands (ADR 0046). */
const PUSH_SENDER = new EnvironmentAllowance<PushSenderKind>(
  'NOTIFICATIONS_PUSH_SENDER',
  {
    [DeployEnvironment.Dev]: [PushSenderKind.Memory, PushSenderKind.None],
    [DeployEnvironment.Staging]: [PushSenderKind.None],
    [DeployEnvironment.Prod]: [PushSenderKind.None],
  },
);

/** Notifications configuration. The libraries read their own (database, Valkey, auth, real time) through their section. */
export const notificationsConfigSchema = serviceConfigSchema
  .extend({
    ...internalHttpConfigSchema.shape,
    NOTIFICATIONS_EMAIL_SENDER: z
      .enum(EmailSenderKind)
      .default(EmailSenderKind.Memory),
    /** Development SMTP server (Mailpit), `smtp://host:port`; without a port, 25. */
    SMTP_URL: z.url().optional(),
    NOTIFICATIONS_FROM_ADDRESS: z.email(),
    /** Hash of the recipients in `email_messages` and in the suppression list: the email address is never stored. */
    NOTIFICATIONS_EMAIL_PEPPER: secret({ minLength: 32 }),
    NOTIFICATIONS_PUSH_SENDER: z
      .enum(PushSenderKind)
      .default(PushSenderKind.Memory),
    NOTIFICATIONS_INBOX_RETENTION_DAYS: envNumber({ min: 1 }).default(
      NotificationsDefaults.inboxRetentionDays,
    ),
    REALTIME_HOST: z.enum(RealtimeHost).default(RealtimeHost.Service),
  })
  .superRefine((config, ctx) => {
    EMAIL_SENDER.check(
      config.DEPLOY_ENVIRONMENT,
      config.NOTIFICATIONS_EMAIL_SENDER,
      ctx,
    );
    PUSH_SENDER.check(
      config.DEPLOY_ENVIRONMENT,
      config.NOTIFICATIONS_PUSH_SENDER,
      ctx,
    );
    if (
      config.NOTIFICATIONS_EMAIL_SENDER === EmailSenderKind.Smtp &&
      config.SMTP_URL === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_URL'],
        message: 'NOTIFICATIONS_EMAIL_SENDER=smtp requires SMTP_URL',
      });
    }
  });

export type NotificationsConfig = z.output<typeof notificationsConfigSchema>;
