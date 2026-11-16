// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../notifications/schemas/notifications_schemas.dart';
import '../../notifications/types/notifications_types.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';
import '../../platform/types/platform_types.dart';

/// Rutas HTTP públicas del contrato `notifications`.
abstract final class NotificationsRoutes {
  /// Lista las notificaciones de la bandeja del usuario.
  ///
  /// `GET /v1/notifications`
  static const listInbox = RouteDescriptor<PageQuery, NotificationPage>(
    id: 'notifications.inbox.list',
    method: HttpMethod.get,
    path: '/v1/notifications',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: NotificationPageSchema.validateIncoming,
    decodeResponse: NotificationPage.fromJson,
  );

  /// Cuenta las notificaciones sin leer de la bandeja del usuario.
  ///
  /// `GET /v1/notifications/unread-count`
  static const getUnreadCount = RouteDescriptor<Empty, UnreadCount>(
    id: 'notifications.inbox.unread-count',
    method: HttpMethod.get,
    path: '/v1/notifications/unread-count',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: UnreadCountSchema.validateIncoming,
    decodeResponse: UnreadCount.fromJson,
  );

  /// Marca como leída una notificación; repetirlo no falla.
  ///
  /// `POST /v1/notifications/{notificationId}/read`
  static const markRead = RouteDescriptor<MarkNotificationReadRequest, void>(
    id: 'notifications.inbox.mark-read',
    method: HttpMethod.post,
    path: '/v1/notifications/{notificationId}/read',
    version: 1,
    pathParams: <String>['notificationId'],
    requestLocation: RequestLocation.body,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'NOTIFICATIONS.INBOX.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: MarkNotificationReadRequest.encode,
    validateRequest: MarkNotificationReadRequestSchema.validate,
  );

  /// Marca como leídas todas las notificaciones del usuario.
  ///
  /// `POST /v1/notifications/read-all`
  static const markAllRead = RouteDescriptor<Empty, void>(
    id: 'notifications.inbox.mark-all-read',
    method: HttpMethod.post,
    path: '/v1/notifications/read-all',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
  );

  /// Devuelve las preferencias de notificaciones del usuario.
  ///
  /// `GET /v1/notification-preferences`
  static const getPreferences = RouteDescriptor<Empty, NotificationPreferences>(
    id: 'notifications.preferences.get',
    method: HttpMethod.get,
    path: '/v1/notification-preferences',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: NotificationPreferencesSchema.validateIncoming,
    decodeResponse: NotificationPreferences.fromJson,
  );

  /// Guarda las preferencias de notificaciones del usuario.
  ///
  /// `PUT /v1/notification-preferences`
  static const savePreferences = RouteDescriptor<NotificationPreferences, void>(
    id: 'notifications.preferences.save',
    method: HttpMethod.put,
    path: '/v1/notification-preferences',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.VALIDATION.INVALID_INPUT',
      'NOTIFICATIONS.PREFERENCES.INVALID_QUIET_HOURS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: NotificationPreferences.encode,
    validateRequest: NotificationPreferencesSchema.validate,
  );
}
