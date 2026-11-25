import { z } from 'zod';
import {
  envNumber,
  NodeEnv,
  secret,
  serviceConfigSchema,
} from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';
import { NotificationsDefaults } from '../shared/constants/notifications-defaults.constants.js';
import { EmailSenderKind } from '../shared/enums/email-sender-kind.enum.js';
import { PushSenderKind } from '../shared/enums/push-sender-kind.enum.js';
import { RealtimeHost } from '../shared/enums/realtime-host.enum.js';

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
    if (config.NOTIFICATIONS_EMAIL_SENDER !== EmailSenderKind.Smtp) {
      return;
    }
    if (
      config.NODE_ENV !== NodeEnv.Development &&
      config.NODE_ENV !== NodeEnv.Test
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['NOTIFICATIONS_EMAIL_SENDER'],
        message:
          'smtp is only allowed in development and tests: it neither authenticates nor encrypts',
      });
    }
    if (config.SMTP_URL === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_URL'],
        message: 'NOTIFICATIONS_EMAIL_SENDER=smtp requires SMTP_URL',
      });
    }
  });

export type NotificationsConfig = z.output<typeof notificationsConfigSchema>;
