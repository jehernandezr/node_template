import { z } from 'zod';
import {
  IdSchema,
  pageOf,
  TimestampSchema,
  UserRefSchema,
} from '@contracts/platform';
import { NotificationsLimits } from '../constants/notifications.constants.js';
import {
  EmailTemplate,
  TemplateParameter,
} from '../enums/notifications.enum.js';
import type {
  AppNotification,
  EraseNotificationsUserInput,
  EraseNotificationsUserResult,
  MarkNotificationReadRequest,
  NotificationPage,
  NotificationPreferenceEntry,
  NotificationPreferences,
  NotifyUserInput,
  NotifyUserResult,
  SendEmailInput,
  SendEmailResult,
  TemplateParameterValue,
  UnreadCount,
} from '../types/notification.type.js';
import {
  NotificationChannelSchema,
  NotificationTypeSchema,
} from './event.schema.js';

const TitleSchema = z.string().min(1).max(NotificationsLimits.titleMaxLength);

const BodySchema = z.string().min(1).max(NotificationsLimits.bodyMaxLength);

const QuietTimeSchema = z
  .string()
  .min(5)
  .max(5)
  .regex(new RegExp(NotificationsLimits.quietTimePattern));

const TimezoneSchema = z
  .string()
  .min(1)
  .max(NotificationsLimits.timezoneMaxLength);

const ParameterValueSchema = z
  .string()
  .min(1)
  .max(NotificationsLimits.parameterValueMaxLength);

export const EmailTemplateSchema = z
  .enum(EmailTemplate)
  .describe(
    'Plantilla de correo transaccional.',
  ) satisfies z.ZodType<EmailTemplate>;

export const TemplateParameterSchema = z
  .enum(TemplateParameter)
  .describe(
    'Nombre de un dato que llena una plantilla.',
  ) satisfies z.ZodType<TemplateParameter>;

export const AppNotificationSchema = z
  .object({
    id: IdSchema,
    type: NotificationTypeSchema,
    title: TitleSchema,
    body: BodySchema,
    createdAt: TimestampSchema,
    read: z.boolean(),
  })
  .describe(
    'Notificación de la bandeja del usuario.',
  ) satisfies z.ZodType<AppNotification>;

export const NotificationPageSchema = pageOf(
  AppNotificationSchema,
  'Página de la bandeja, de la más nueva a la más antigua.',
) satisfies z.ZodType<NotificationPage>;

export const UnreadCountSchema = z
  .object({ count: z.int().min(0) })
  .describe(
    'Notificaciones sin leer de la bandeja.',
  ) satisfies z.ZodType<UnreadCount>;

export const MarkNotificationReadRequestSchema = z
  .strictObject({ notificationId: IdSchema })
  .describe(
    'Notificación a marcar como leída.',
  ) satisfies z.ZodType<MarkNotificationReadRequest>;

export const NotificationPreferenceEntrySchema = z
  .object({
    type: NotificationTypeSchema,
    channels: z
      .array(NotificationChannelSchema)
      .max(NotificationsLimits.maxChannels),
  })
  .describe(
    'Canales por los que el usuario recibe un tipo de notificación.',
  ) satisfies z.ZodType<NotificationPreferenceEntry>;

export const NotificationPreferencesSchema = z
  .strictObject({
    enabled: z
      .array(NotificationPreferenceEntrySchema)
      .max(NotificationsLimits.maxTypes),
    quietStart: QuietTimeSchema,
    quietEnd: QuietTimeSchema,
    timezone: TimezoneSchema,
  })
  .describe(
    'Preferencias de notificaciones del usuario.',
  ) satisfies z.ZodType<NotificationPreferences>;

export const TemplateParameterValueSchema = z
  .strictObject({
    name: TemplateParameterSchema,
    value: ParameterValueSchema,
  })
  .describe(
    'Valor de un dato de plantilla.',
  ) satisfies z.ZodType<TemplateParameterValue>;

export const SendEmailInputSchema = z
  .strictObject({
    messageId: IdSchema,
    template: EmailTemplateSchema,
    to: z.email().max(NotificationsLimits.recipientMaxLength),
    locale: z
      .string()
      .min(2)
      .max(NotificationsLimits.localeMaxLength)
      .optional(),
    parameters: z
      .array(TemplateParameterValueSchema)
      .max(NotificationsLimits.maxParameters),
  })
  .describe(
    'Correo transaccional a enviar, con sus datos de plantilla.',
  ) satisfies z.ZodType<SendEmailInput>;

export const SendEmailResultSchema = z
  .object({ messageId: IdSchema })
  .describe(
    'Correo transaccional aceptado para envío.',
  ) satisfies z.ZodType<SendEmailResult>;

export const NotifyUserInputSchema = z
  .strictObject({
    notificationId: IdSchema,
    user: UserRefSchema,
    tenantId: IdSchema,
    type: NotificationTypeSchema,
    parameters: z
      .array(TemplateParameterValueSchema)
      .max(NotificationsLimits.maxParameters),
  })
  .describe(
    'Notificación a entregar a un usuario por sus canales.',
  ) satisfies z.ZodType<NotifyUserInput>;

export const NotifyUserResultSchema = z
  .object({
    notificationId: IdSchema,
    channels: z
      .array(NotificationChannelSchema)
      .max(NotificationsLimits.maxChannels),
  })
  .describe(
    'Canales por los que salió una notificación.',
  ) satisfies z.ZodType<NotifyUserResult>;

export const EraseNotificationsUserInputSchema = z
  .strictObject({ user: UserRefSchema })
  .describe(
    'Usuario cuyos datos de notificaciones se borran.',
  ) satisfies z.ZodType<EraseNotificationsUserInput>;

export const EraseNotificationsUserResultSchema = z
  .object({ userId: IdSchema, affectedRows: z.int().min(0) })
  .describe(
    'Filas de notificaciones borradas para un usuario.',
  ) satisfies z.ZodType<EraseNotificationsUserResult>;
