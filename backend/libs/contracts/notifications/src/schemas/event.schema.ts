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
  .describe('Notification type.') satisfies z.ZodType<NotificationType>;

export const NotificationChannelSchema = z
  .enum(NotificationChannel)
  .describe(
    'Channel of a notification.',
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
    'A notification was created.',
  ) satisfies z.ZodType<NotificationCreatedPayload>;
