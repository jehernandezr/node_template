// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

/// Notification type.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum NotificationType {
  securityAlert('security_alert'),
  taskUpdated('task_updated'),
  invoiceIssued('invoice_issued'),
  accountActivity('account_activity');

  const NotificationType(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static NotificationType? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Channel of a notification.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum NotificationChannel {
  inApp('in_app'),
  push('push'),
  email('email');

  const NotificationChannel(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static NotificationChannel? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationFrameType` of the `notifications` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum NotificationFrameType {
  notification('notification'),
  unreadCount('unread-count'),
  sessionClosed('session-closed');

  const NotificationFrameType(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static NotificationFrameType? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Transactional email template.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum EmailTemplate {
  verifyEmail('verify_email'),
  passwordReset('password_reset'),
  mfaCode('mfa_code'),
  emailChange('email_change'),
  invitation('invitation'),
  emailAlreadyRegistered('email_already_registered'),
  mfaRecovery('mfa_recovery');

  const EmailTemplate(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static EmailTemplate? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Name of a value that fills a template.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TemplateParameter {
  code('code'),
  link('link'),
  displayName('display_name'),
  tenantName('tenant_name'),
  reference('reference'),
  availableAt('available_at');

  const TemplateParameter(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TemplateParameter? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Public error codes of the `notifications` contract.
///
/// Only includes codes with `public` audience: internal ones never
/// reach the client. [messageKey] is the message key in the ARB.
enum NotificationsErrorCode {
  /// The notification does not exist in the user inbox.
  inboxNotFound(
    'NOTIFICATIONS.INBOX.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_notifications_inbox_not_found',
  ),

  /// The quiet hours are invalid: the time zone is missing or the hours do not have the HH:mm format.
  preferencesInvalidQuietHours(
    'NOTIFICATIONS.PREFERENCES.INVALID_QUIET_HOURS',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_notifications_preferences_invalid_quiet_hours',
  ),

  /// The realtime connection does not carry a valid credential.
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

  /// Exact code sent by the backend, for example `NOTIFICATIONS.INBOX.NOT_FOUND`.
  final String code;

  /// HTTP status the backend responds with.
  final int httpStatus;

  /// Whether the client may retry the same request.
  final bool retryable;

  /// ARB key of the human-readable message.
  final String messageKey;

  /// Same as [code].
  String get wireCode => code;

  /// Value with [code], or null if this client does not know it.
  static NotificationsErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Same as [fromCode].
  static NotificationsErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `NotificationsRoute` of the `notifications` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum NotificationsRoute {
  listInbox('notifications.inbox.list'),
  getUnreadCount('notifications.inbox.unread-count'),
  markRead('notifications.inbox.mark-read'),
  markAllRead('notifications.inbox.mark-all-read'),
  getPreferences('notifications.preferences.get'),
  savePreferences('notifications.preferences.save');

  const NotificationsRoute(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static NotificationsRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationsOperation` of the `notifications` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum NotificationsOperation {
  sendMessage('notifications.messages.send.v1'),
  notifyUser('notifications.users.notify.v1'),
  eraseUserData('notifications.user-data.erase.v1'),
  tenantMoveSync('notifications.tenant-move.sync.v1'),
  tenantMoveFinalize('notifications.tenant-move.finalize.v1'),
  tenantMoveAbort('notifications.tenant-move.abort.v1'),
  tenantMoveSwitch('notifications.tenant-move.switch.v1'),
  tenantMoveCleanup('notifications.tenant-move.cleanup.v1'),
  tenantDirectoryPlace('notifications.tenant-directory.place.v1'),
  tenantDirectoryRemove('notifications.tenant-directory.remove.v1');

  const NotificationsOperation(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static NotificationsOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationsEvent` of the `notifications` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum NotificationsEvent {
  notificationCreated('notifications.notification.created.v1');

  const NotificationsEvent(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static NotificationsEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationsTopic` of the `notifications` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum NotificationsTopic {
  events('notifications-events');

  const NotificationsTopic(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static NotificationsTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `NotificationsQueue` of the `notifications` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum NotificationsQueue {
  triggers('notifications-triggers'),
  realtimeControl('notifications-realtime-control');

  const NotificationsQueue(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static NotificationsQueue? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
