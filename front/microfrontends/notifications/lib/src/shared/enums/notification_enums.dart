/// Tipos de notificación. El tipo define la criticidad; las preferencias
/// del usuario definen los canales por los que llega.
enum NotificationType {
  securityAlert,
  taskUpdated,
  invoiceIssued,
  accountActivity;

  /// Las alertas de seguridad salen siempre por todos los canales.
  bool get isMandatory => this == securityAlert;
}

/// Canales por los que puede llegar una notificación.
enum NotificationChannel { inApp, push, email }
