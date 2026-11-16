import 'package:shell_core/shell_core.dart';

/// Cantidad de notificaciones no leídas del usuario actual.
///
/// La publica el ciclo de vida de notificaciones y el manifiesto la declara
/// como insignia de su entrada de menú, así el shell la dibuja sin conocer
/// este microfrontend. Se repite: el shell que se suscribe tarde ve el último
/// valor, hasta que cambia la identidad (`ShellEventBus.clearReplay`).
final class UnreadCountChanged extends ReplayableShellEvent {
  const UnreadCountChanged(this.count);

  /// No leídas, cero o más.
  final int count;
}
