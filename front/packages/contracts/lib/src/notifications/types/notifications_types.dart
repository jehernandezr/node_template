// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import 'package:meta/meta.dart';

import '../../core/core.dart';
import '../../notifications/enums/notifications_enums.dart';
import '../../platform/types/platform_types.dart';

/// Se creó una notificación.
@immutable
final class NotificationCreatedPayload {
  const NotificationCreatedPayload({
    required this.notificationId,
    required this.tenantId,
    required this.type,
    required this.channels,
    required this.createdAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory NotificationCreatedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return NotificationCreatedPayload(
        notificationId: json['notificationId'] as String,
        tenantId: json['tenantId'] as String,
        type: decodeEnum(
          json['type'],
          NotificationType.tryParse,
          'NotificationType',
        ),
        channels: [
          for (final e0 in json['channels'] as List<dynamic>)
            ?NotificationChannel.tryParse(e0 as String),
        ],
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid NotificationCreatedPayload: $error', json);
    }
  }

  final String notificationId;

  final String tenantId;

  final NotificationType type;

  final List<NotificationChannel> channels;

  final DateTime createdAt;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'notificationId': notificationId,
    'tenantId': tenantId,
    'type': type.wireCode,
    'channels': [for (final e0 in channels) e0.wireCode],
    'createdAt': createdAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(NotificationCreatedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationCreatedPayload &&
          contractEquals(notificationId, other.notificationId) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(type, other.type) &&
          contractEquals(channels, other.channels) &&
          contractEquals(createdAt, other.createdAt);

  @override
  int get hashCode =>
      contractHash([notificationId, tenantId, type, channels, createdAt]);
}

/// Notificación de la bandeja del usuario.
@immutable
final class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.read,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory AppNotification.fromJson(Map<String, dynamic> json) {
    try {
      return AppNotification(
        id: json['id'] as String,
        type: decodeEnum(
          json['type'],
          NotificationType.tryParse,
          'NotificationType',
        ),
        title: json['title'] as String,
        body: json['body'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        read: json['read'] as bool,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid AppNotification: $error', json);
    }
  }

  final String id;

  final NotificationType type;

  final String title;

  final String body;

  final DateTime createdAt;

  final bool read;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'type': type.wireCode,
    'title': title,
    'body': body,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'read': read,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(AppNotification value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppNotification &&
          contractEquals(id, other.id) &&
          contractEquals(type, other.type) &&
          contractEquals(title, other.title) &&
          contractEquals(body, other.body) &&
          contractEquals(createdAt, other.createdAt) &&
          contractEquals(read, other.read);

  @override
  int get hashCode => contractHash([id, type, title, body, createdAt, read]);
}

/// Página de la bandeja, de la más nueva a la más antigua.
@immutable
final class NotificationPage {
  const NotificationPage({required this.items, required this.nextCursor});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory NotificationPage.fromJson(Map<String, dynamic> json) {
    try {
      return NotificationPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            AppNotification.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid NotificationPage: $error', json);
    }
  }

  final List<AppNotification> items;

  final String? nextCursor;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(NotificationPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Notificaciones sin leer de la bandeja.
@immutable
final class UnreadCount {
  const UnreadCount({required this.count});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory UnreadCount.fromJson(Map<String, dynamic> json) {
    try {
      return UnreadCount(count: (json['count'] as num).toInt());
    } on TypeError catch (error) {
      throw FormatException('Invalid UnreadCount: $error', json);
    }
  }

  final int count;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'count': count};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(UnreadCount value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UnreadCount && contractEquals(count, other.count);

  @override
  int get hashCode => contractHash([count]);
}

/// Notificación a marcar como leída.
@immutable
final class MarkNotificationReadRequest {
  const MarkNotificationReadRequest({required this.notificationId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory MarkNotificationReadRequest.fromJson(Map<String, dynamic> json) {
    try {
      return MarkNotificationReadRequest(
        notificationId: json['notificationId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid MarkNotificationReadRequest: $error',
        json,
      );
    }
  }

  final String notificationId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'notificationId': notificationId,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(MarkNotificationReadRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MarkNotificationReadRequest &&
          contractEquals(notificationId, other.notificationId);

  @override
  int get hashCode => contractHash([notificationId]);
}

/// Canales por los que el usuario recibe un tipo de notificación.
@immutable
final class NotificationPreferenceEntry {
  const NotificationPreferenceEntry({
    required this.type,
    required this.channels,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory NotificationPreferenceEntry.fromJson(Map<String, dynamic> json) {
    try {
      return NotificationPreferenceEntry(
        type: decodeEnum(
          json['type'],
          NotificationType.tryParse,
          'NotificationType',
        ),
        channels: [
          for (final e0 in json['channels'] as List<dynamic>)
            ?NotificationChannel.tryParse(e0 as String),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid NotificationPreferenceEntry: $error',
        json,
      );
    }
  }

  final NotificationType type;

  final List<NotificationChannel> channels;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'type': type.wireCode,
    'channels': [for (final e0 in channels) e0.wireCode],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(NotificationPreferenceEntry value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationPreferenceEntry &&
          contractEquals(type, other.type) &&
          contractEquals(channels, other.channels);

  @override
  int get hashCode => contractHash([type, channels]);
}

/// Preferencias de notificaciones del usuario.
@immutable
final class NotificationPreferences {
  const NotificationPreferences({
    required this.enabled,
    required this.quietStart,
    required this.quietEnd,
    required this.timezone,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    try {
      return NotificationPreferences(
        enabled: [
          for (final e0 in json['enabled'] as List<dynamic>)
            NotificationPreferenceEntry.fromJson(e0 as Map<String, dynamic>),
        ],
        quietStart: json['quietStart'] as String,
        quietEnd: json['quietEnd'] as String,
        timezone: json['timezone'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid NotificationPreferences: $error', json);
    }
  }

  final List<NotificationPreferenceEntry> enabled;

  final String quietStart;

  final String quietEnd;

  final String timezone;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'enabled': [for (final e0 in enabled) e0.toJson()],
    'quietStart': quietStart,
    'quietEnd': quietEnd,
    'timezone': timezone,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(NotificationPreferences value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationPreferences &&
          contractEquals(enabled, other.enabled) &&
          contractEquals(quietStart, other.quietStart) &&
          contractEquals(quietEnd, other.quietEnd) &&
          contractEquals(timezone, other.timezone);

  @override
  int get hashCode => contractHash([enabled, quietStart, quietEnd, timezone]);
}

/// Valor de un dato de plantilla.
@immutable
final class TemplateParameterValue {
  const TemplateParameterValue({required this.name, required this.value});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TemplateParameterValue.fromJson(Map<String, dynamic> json) {
    try {
      return TemplateParameterValue(
        name: decodeEnum(
          json['name'],
          TemplateParameter.tryParse,
          'TemplateParameter',
        ),
        value: json['value'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TemplateParameterValue: $error', json);
    }
  }

  final TemplateParameter name;

  final String value;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'name': name.wireCode,
    'value': value,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TemplateParameterValue value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TemplateParameterValue &&
          contractEquals(name, other.name) &&
          contractEquals(value, other.value);

  @override
  int get hashCode => contractHash([name, value]);
}

/// Correo transaccional a enviar, con sus datos de plantilla.
@immutable
final class SendEmailInput {
  const SendEmailInput({
    required this.messageId,
    required this.template,
    required this.to,
    this.locale,
    required this.parameters,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SendEmailInput.fromJson(Map<String, dynamic> json) {
    try {
      return SendEmailInput(
        messageId: json['messageId'] as String,
        template: decodeEnum(
          json['template'],
          EmailTemplate.tryParse,
          'EmailTemplate',
        ),
        to: json['to'] as String,
        locale: json['locale'] as String?,
        parameters: [
          for (final e0 in json['parameters'] as List<dynamic>)
            TemplateParameterValue.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SendEmailInput: $error', json);
    }
  }

  final String messageId;

  final EmailTemplate template;

  final String to;

  final String? locale;

  final List<TemplateParameterValue> parameters;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'messageId': messageId,
    'template': template.wireCode,
    'to': to,
    'locale': ?locale,
    'parameters': [for (final e0 in parameters) e0.toJson()],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SendEmailInput value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SendEmailInput &&
          contractEquals(messageId, other.messageId) &&
          contractEquals(template, other.template) &&
          contractEquals(to, other.to) &&
          contractEquals(locale, other.locale) &&
          contractEquals(parameters, other.parameters);

  @override
  int get hashCode =>
      contractHash([messageId, template, to, locale, parameters]);
}

/// Correo transaccional aceptado para envío.
@immutable
final class SendEmailResult {
  const SendEmailResult({required this.messageId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SendEmailResult.fromJson(Map<String, dynamic> json) {
    try {
      return SendEmailResult(messageId: json['messageId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid SendEmailResult: $error', json);
    }
  }

  final String messageId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'messageId': messageId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SendEmailResult value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SendEmailResult && contractEquals(messageId, other.messageId);

  @override
  int get hashCode => contractHash([messageId]);
}

/// Notificación a entregar a un usuario por sus canales.
@immutable
final class NotifyUserInput {
  const NotifyUserInput({
    required this.notificationId,
    required this.user,
    required this.tenantId,
    required this.type,
    required this.parameters,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory NotifyUserInput.fromJson(Map<String, dynamic> json) {
    try {
      return NotifyUserInput(
        notificationId: json['notificationId'] as String,
        user: UserRef.fromJson(json['user'] as Map<String, dynamic>),
        tenantId: json['tenantId'] as String,
        type: decodeEnum(
          json['type'],
          NotificationType.tryParse,
          'NotificationType',
        ),
        parameters: [
          for (final e0 in json['parameters'] as List<dynamic>)
            TemplateParameterValue.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid NotifyUserInput: $error', json);
    }
  }

  final String notificationId;

  final UserRef user;

  final String tenantId;

  final NotificationType type;

  final List<TemplateParameterValue> parameters;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'notificationId': notificationId,
    'user': user.toJson(),
    'tenantId': tenantId,
    'type': type.wireCode,
    'parameters': [for (final e0 in parameters) e0.toJson()],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(NotifyUserInput value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotifyUserInput &&
          contractEquals(notificationId, other.notificationId) &&
          contractEquals(user, other.user) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(type, other.type) &&
          contractEquals(parameters, other.parameters);

  @override
  int get hashCode =>
      contractHash([notificationId, user, tenantId, type, parameters]);
}

/// Canales por los que salió una notificación.
@immutable
final class NotifyUserResult {
  const NotifyUserResult({
    required this.notificationId,
    required this.channels,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory NotifyUserResult.fromJson(Map<String, dynamic> json) {
    try {
      return NotifyUserResult(
        notificationId: json['notificationId'] as String,
        channels: [
          for (final e0 in json['channels'] as List<dynamic>)
            ?NotificationChannel.tryParse(e0 as String),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid NotifyUserResult: $error', json);
    }
  }

  final String notificationId;

  final List<NotificationChannel> channels;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'notificationId': notificationId,
    'channels': [for (final e0 in channels) e0.wireCode],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(NotifyUserResult value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotifyUserResult &&
          contractEquals(notificationId, other.notificationId) &&
          contractEquals(channels, other.channels);

  @override
  int get hashCode => contractHash([notificationId, channels]);
}

/// Usuario cuyos datos de notificaciones se borran.
@immutable
final class EraseNotificationsUserInput {
  const EraseNotificationsUserInput({required this.user});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory EraseNotificationsUserInput.fromJson(Map<String, dynamic> json) {
    try {
      return EraseNotificationsUserInput(
        user: UserRef.fromJson(json['user'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid EraseNotificationsUserInput: $error',
        json,
      );
    }
  }

  final UserRef user;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'user': user.toJson()};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(EraseNotificationsUserInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EraseNotificationsUserInput && contractEquals(user, other.user);

  @override
  int get hashCode => contractHash([user]);
}

/// Filas de notificaciones borradas para un usuario.
@immutable
final class EraseNotificationsUserResult {
  const EraseNotificationsUserResult({
    required this.userId,
    required this.affectedRows,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory EraseNotificationsUserResult.fromJson(Map<String, dynamic> json) {
    try {
      return EraseNotificationsUserResult(
        userId: json['userId'] as String,
        affectedRows: (json['affectedRows'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid EraseNotificationsUserResult: $error',
        json,
      );
    }
  }

  final String userId;

  final int affectedRows;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'affectedRows': affectedRows,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(EraseNotificationsUserResult value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EraseNotificationsUserResult &&
          contractEquals(userId, other.userId) &&
          contractEquals(affectedRows, other.affectedRows);

  @override
  int get hashCode => contractHash([userId, affectedRows]);
}
