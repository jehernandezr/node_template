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
  .describe('Transactional email template.') satisfies z.ZodType<EmailTemplate>;

export const TemplateParameterSchema = z
  .enum(TemplateParameter)
  .describe(
    'Name of a value that fills a template.',
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
    'Notification in the user inbox.',
  ) satisfies z.ZodType<AppNotification>;

export const NotificationPageSchema = pageOf(
  AppNotificationSchema,
  'Page of the inbox, newest to oldest.',
) satisfies z.ZodType<NotificationPage>;

export const UnreadCountSchema = z
  .object({ count: z.int().min(0) })
  .describe(
    'Unread notifications in the inbox.',
  ) satisfies z.ZodType<UnreadCount>;

export const MarkNotificationReadRequestSchema = z
  .strictObject({ notificationId: IdSchema })
  .describe(
    'Notification to mark as read.',
  ) satisfies z.ZodType<MarkNotificationReadRequest>;

export const NotificationPreferenceEntrySchema = z
  .object({
    type: NotificationTypeSchema,
    channels: z
      .array(NotificationChannelSchema)
      .max(NotificationsLimits.maxChannels),
  })
  .describe(
    'Channels through which the user receives a notification type.',
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
    'Notification preferences of the user.',
  ) satisfies z.ZodType<NotificationPreferences>;

export const TemplateParameterValueSchema = z
  .strictObject({
    name: TemplateParameterSchema,
    value: ParameterValueSchema,
  })
  .describe(
    'Value of a template field.',
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
    'Transactional email to send, with its template values.',
  ) satisfies z.ZodType<SendEmailInput>;

export const SendEmailResultSchema = z
  .object({ messageId: IdSchema })
  .describe(
    'Transactional email accepted for sending.',
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
    'Notification to deliver to a user through their channels.',
  ) satisfies z.ZodType<NotifyUserInput>;

export const NotifyUserResultSchema = z
  .object({
    notificationId: IdSchema,
    channels: z
      .array(NotificationChannelSchema)
      .max(NotificationsLimits.maxChannels),
  })
  .describe(
    'Channels through which a notification was sent.',
  ) satisfies z.ZodType<NotifyUserResult>;

export const EraseNotificationsUserInputSchema = z
  .strictObject({ user: UserRefSchema })
  .describe(
    'User whose notification data is deleted.',
  ) satisfies z.ZodType<EraseNotificationsUserInput>;

export const EraseNotificationsUserResultSchema = z
  .object({ userId: IdSchema, affectedRows: z.int().min(0) })
  .describe(
    'Notification rows deleted for a user.',
  ) satisfies z.ZodType<EraseNotificationsUserResult>;
