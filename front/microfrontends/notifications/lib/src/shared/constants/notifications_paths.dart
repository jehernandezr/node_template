/// Rutas del microfrontend de notificaciones.
abstract final class NotificationsPaths {
  /// Bandeja. Ruta raíz del microfrontend.
  static const String inbox = '/notifications';

  /// Segmento relativo de las preferencias, hijo de [inbox].
  static const String preferencesSegment = 'preferences';

  /// Ruta absoluta de las preferencias.
  static const String preferences = '$inbox/$preferencesSegment';
}
