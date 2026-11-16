// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Tipo de notificación.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum NotificationType {
  securityAlert('security_alert'),
  taskUpdated('task_updated'),
  invoiceIssued('invoice_issued'),
  accountActivity('account_activity');

  const NotificationType(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static NotificationType? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Canal de una notificación.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum NotificationChannel {
  inApp('in_app'),
  push('push'),
  email('email');

  const NotificationChannel(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static NotificationChannel? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationFrameType` del contrato `notifications`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum NotificationFrameType {
  notification('notification'),
  unreadCount('unread-count'),
  sessionClosed('session-closed');

  const NotificationFrameType(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static NotificationFrameType? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Plantilla de correo transaccional.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum EmailTemplate {
  verifyEmail('verify_email'),
  passwordReset('password_reset'),
  mfaCode('mfa_code'),
  emailChange('email_change'),
  invitation('invitation');

  const EmailTemplate(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static EmailTemplate? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Nombre de un dato que llena una plantilla.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TemplateParameter {
  code('code'),
  link('link'),
  displayName('display_name'),
  tenantName('tenant_name'),
  reference('reference');

  const TemplateParameter(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TemplateParameter? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Códigos de error públicos del contrato `notifications`.
///
/// Solo incluye los códigos con audiencia `public`: los internos nunca
/// llegan al cliente. [messageKey] es la clave del mensaje en el ARB.
enum NotificationsErrorCode {
  /// La notificación no existe en la bandeja del usuario.
  inboxNotFound(
    'NOTIFICATIONS.INBOX.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_notifications_inbox_not_found',
  ),

  /// El horario de silencio es inválido: falta la zona horaria o las horas no tienen el formato HH:mm.
  preferencesInvalidQuietHours(
    'NOTIFICATIONS.PREFERENCES.INVALID_QUIET_HOURS',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_notifications_preferences_invalid_quiet_hours',
  ),

  /// La conexión en tiempo real no trae una credencial válida.
  realtimeUnauthenticated(
    'NOTIFICATIONS.REALTIME.UNAUTHENTICATED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_notifications_realtime_unauthenticated',
  );

  const NotificationsErrorCode(
    this.code, {
    required this.httpStatus,
    required this.retryable,
    required this.messageKey,
  });

  /// Código exacto que envía el backend, por ejemplo `NOTIFICATIONS.INBOX.NOT_FOUND`.
  final String code;

  /// Estado HTTP con el que responde el backend.
  final int httpStatus;

  /// Si el cliente puede reintentar la misma petición.
  final bool retryable;

  /// Clave ARB del mensaje para personas.
  final String messageKey;

  /// Igual a [code].
  String get wireCode => code;

  /// Valor con [code], o null si este cliente no lo conoce.
  static NotificationsErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Igual a [fromCode].
  static NotificationsErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `NotificationsRoute` del contrato `notifications`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum NotificationsRoute {
  listInbox('notifications.inbox.list'),
  getUnreadCount('notifications.inbox.unread-count'),
  markRead('notifications.inbox.mark-read'),
  markAllRead('notifications.inbox.mark-all-read'),
  getPreferences('notifications.preferences.get'),
  savePreferences('notifications.preferences.save');

  const NotificationsRoute(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static NotificationsRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationsOperation` del contrato `notifications`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum NotificationsOperation {
  sendMessage('notifications.messages.send.v1'),
  notifyUser('notifications.users.notify.v1'),
  eraseUserData('notifications.user-data.erase.v1'),
  tenantMoveSync('notifications.tenant-move.sync.v1'),
  tenantMoveFinalize('notifications.tenant-move.finalize.v1'),
  tenantMoveAbort('notifications.tenant-move.abort.v1'),
  tenantMoveCleanup('notifications.tenant-move.cleanup.v1');

  const NotificationsOperation(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static NotificationsOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationsEvent` del contrato `notifications`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum NotificationsEvent {
  notificationCreated('notifications.notification.created.v1');

  const NotificationsEvent(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static NotificationsEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationsTopic` del contrato `notifications`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum NotificationsTopic {
  events('notifications-events');

  const NotificationsTopic(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static NotificationsTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationsQueue` del contrato `notifications`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum NotificationsQueue {
  triggers('notifications-triggers'),
  realtimeControl('notifications-realtime-control');

  const NotificationsQueue(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static NotificationsQueue? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
