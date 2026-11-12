// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'notifications_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class NotificationsLocalizationsEs extends NotificationsLocalizations {
  NotificationsLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get inboxTitle => 'Notificaciones';

  @override
  String get preferencesTitle => 'Preferencias de notificaciones';

  @override
  String get preferencesTooltip => 'Preferencias';

  @override
  String get markAllRead => 'Marcar todas como leídas';

  @override
  String get unreadLabel => 'No leída';

  @override
  String get readLabel => 'Leída';

  @override
  String get emptyTitle => 'No tienes notificaciones';

  @override
  String get emptyMessage => 'Aquí aparecerán los avisos de tu cuenta.';

  @override
  String get loadError => 'No pudimos cargar tus notificaciones.';

  @override
  String get saveError => 'No pudimos guardar tus preferencias.';

  @override
  String get typeHeader => 'Tipo';

  @override
  String get typeSecurityAlert => 'Alertas de seguridad';

  @override
  String get typeTaskUpdated => 'Tareas';

  @override
  String get typeInvoiceIssued => 'Facturas';

  @override
  String get typeAccountActivity => 'Actividad de la cuenta';

  @override
  String get channelInApp => 'En la app';

  @override
  String get channelPush => 'Push';

  @override
  String get channelEmail => 'Correo';

  @override
  String get securityLocked =>
      'Las alertas de seguridad siempre llegan por todos los canales.';

  @override
  String get quietHoursTitle => 'Horario de silencio';

  @override
  String get quietHoursStart => 'Inicio';

  @override
  String get quietHoursEnd => 'Fin';

  @override
  String get quietHoursStartPicker => 'Hora de inicio';

  @override
  String get quietHoursEndPicker => 'Hora de fin';
}
