import { z } from 'zod';
import { IdSchema, TimestampSchema } from '@contracts/platform';
import { NotificationsLimits } from '../constants/notifications.constants.js';
import {
  NotificationChannel,
  NotificationType,
} from '../enums/notifications.enum.js';
import type { NotificationCreatedPayload } from '../types/event.type.js';

export const NotificationTypeSchema = z
  .enum(NotificationType)
  .describe('Tipo de notificación.') satisfies z.ZodType<NotificationType>;

export const NotificationChannelSchema = z
  .enum(NotificationChannel)
  .describe(
    'Canal de una notificación.',
  ) satisfies z.ZodType<NotificationChannel>;

export const NotificationCreatedPayloadSchema = z
  .object({
    notificationId: IdSchema,
    tenantId: IdSchema,
    type: NotificationTypeSchema,
    channels: z
      .array(NotificationChannelSchema)
      .max(NotificationsLimits.maxChannels),
    createdAt: TimestampSchema,
  })
  .describe(
    'Se creó una notificación.',
  ) satisfies z.ZodType<NotificationCreatedPayload>;
