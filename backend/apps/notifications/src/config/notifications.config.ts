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

/** Configuración de notifications. Las librerías leen las suyas (base, Valkey, auth, tiempo real) por su sección. */
export const notificationsConfigSchema = serviceConfigSchema
  .extend({
    ...internalHttpConfigSchema.shape,
    NOTIFICATIONS_EMAIL_SENDER: z
      .enum(EmailSenderKind)
      .default(EmailSenderKind.Memory),
    /** Servidor SMTP de desarrollo (Mailpit), `smtp://host:puerto`; sin puerto, el 25. */
    SMTP_URL: z.url().optional(),
    NOTIFICATIONS_FROM_ADDRESS: z.email(),
    /** Huella de los destinatarios en `email_messages` y en la lista de supresión: nunca se guarda el correo. */
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
          'smtp solo se permite en desarrollo y en pruebas: no autentica ni cifra',
      });
    }
    if (config.SMTP_URL === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_URL'],
        message: 'NOTIFICATIONS_EMAIL_SENDER=smtp necesita SMTP_URL',
      });
    }
  });

export type NotificationsConfig = z.output<typeof notificationsConfigSchema>;
