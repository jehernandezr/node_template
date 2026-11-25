import { RecordUsageCommand } from '@contracts/billing';
import {
  defineServiceContract,
  defineTenantDirectoryOperations,
  defineTenantMoveOperations,
} from '@contracts/platform';
import {
  NotificationPolicy,
  NotificationsLimits,
} from './constants/notifications.constants.js';
import {
  NotificationsErrorCode,
  NotificationsEvent,
  NotificationsOperation,
  NotificationsQueue,
  NotificationsRoute,
  NotificationsTopic,
} from './enums/identifiers.enum.js';
import {
  EmailTemplate,
  NotificationChannel,
  NotificationFrameType,
  NotificationType,
  TemplateParameter,
} from './enums/notifications.enum.js';
import { notificationsErrorCatalog } from './errors/notifications-error-catalog.js';
import {
  NotificationCreatedEvent,
  NotificationsEventsTopic,
  RealtimeControlQueue,
  TriggersQueue,
} from './events/index.js';
import * as http from './http/index.js';
import * as internal from './internal/index.js';
import * as schemas from './schemas/index.js';

/** Las operaciones de traslado de tenant de notifications, con su tipo exacto para registrarlas y llamarlas. */
export const NotificationsTenantMoveOperations =
  defineTenantMoveOperations('notifications');

/** Las operaciones del directorio de tenants de notifications, con su tipo exacto para registrarlas y llamarlas. */
export const NotificationsTenantDirectoryOperations =
  defineTenantDirectoryOperations('notifications');

/** Contrato del servicio notifications: bandeja, preferencias, despacho por canal, correo transaccional y tiempo real. */
export const notificationsContract = defineServiceContract({
  service: 'notifications',
  description:
    'Notificaciones: bandeja del usuario, preferencias, despacho por canal, correo transaccional y tiempo real.',
  enums: {
    NotificationType,
    NotificationChannel,
    NotificationFrameType,
    EmailTemplate,
    TemplateParameter,
    NotificationsErrorCode,
    NotificationsRoute,
    NotificationsOperation,
    NotificationsEvent,
    NotificationsTopic,
    NotificationsQueue,
  },
  constants: { NotificationsLimits, NotificationPolicy },
  schemas: {
    NotificationType: schemas.NotificationTypeSchema,
    NotificationChannel: schemas.NotificationChannelSchema,
    NotificationCreatedPayload: schemas.NotificationCreatedPayloadSchema,
    AppNotification: schemas.AppNotificationSchema,
    NotificationPage: schemas.NotificationPageSchema,
    UnreadCount: schemas.UnreadCountSchema,
    MarkNotificationReadRequest: schemas.MarkNotificationReadRequestSchema,
    NotificationPreferenceEntry: schemas.NotificationPreferenceEntrySchema,
    NotificationPreferences: schemas.NotificationPreferencesSchema,
    EmailTemplate: schemas.EmailTemplateSchema,
    TemplateParameter: schemas.TemplateParameterSchema,
    TemplateParameterValue: schemas.TemplateParameterValueSchema,
    SendEmailInput: schemas.SendEmailInputSchema,
    SendEmailResult: schemas.SendEmailResultSchema,
    NotifyUserInput: schemas.NotifyUserInputSchema,
    NotifyUserResult: schemas.NotifyUserResultSchema,
    EraseNotificationsUserInput: schemas.EraseNotificationsUserInputSchema,
    EraseNotificationsUserResult: schemas.EraseNotificationsUserResultSchema,
  },
  routes: {
    listInbox: http.ListInboxRoute,
    getUnreadCount: http.GetUnreadCountRoute,
    markRead: http.MarkReadRoute,
    markAllRead: http.MarkAllReadRoute,
    getPreferences: http.GetPreferencesRoute,
    savePreferences: http.SavePreferencesRoute,
  },
  operations: {
    sendEmail: internal.SendEmailOperation,
    notifyUser: internal.NotifyUserOperation,
    eraseUserData: internal.EraseNotificationsUserDataOperation,
    tenantMoveSync: NotificationsTenantMoveOperations.tenantMoveSync,
    tenantMoveFinalize: NotificationsTenantMoveOperations.tenantMoveFinalize,
    tenantMoveAbort: NotificationsTenantMoveOperations.tenantMoveAbort,
    tenantMoveSwitch: NotificationsTenantMoveOperations.tenantMoveSwitch,
    tenantMoveCleanup: NotificationsTenantMoveOperations.tenantMoveCleanup,
    tenantDirectoryPlace:
      NotificationsTenantDirectoryOperations.tenantDirectoryPlace,
    tenantDirectoryRemove:
      NotificationsTenantDirectoryOperations.tenantDirectoryRemove,
  },
  events: { notificationCreated: NotificationCreatedEvent },
  topics: { events: NotificationsEventsTopic },
  queues: {
    triggers: TriggersQueue,
    realtimeControl: RealtimeControlQueue,
  },
  sends: [RecordUsageCommand],
  errors: { NotificationsErrorCode: notificationsErrorCatalog },
});
