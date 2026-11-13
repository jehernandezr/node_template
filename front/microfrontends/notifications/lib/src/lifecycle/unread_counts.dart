import 'package:shell_core/shell_core.dart';

// Diferido: el ciclo de vida viaja en el bundle inicial de web junto al
// manifiesto. El repositorio y el fake solo se descargan al iniciar.
import '../data/notifications_scope.dart' deferred as data;

/// Carga la librería de datos y devuelve el contador de no leídas del
/// repositorio del [scope], o null si el scope se cerró mientras cargaba.
///
/// Variante web (y la que lee el análisis). En la VM se usa
/// `unread_counts_io.dart`: allí la carga diferida no ahorra nada y
/// `loadLibrary` siempre agenda un timer.
Future<Stream<int>?> loadUnreadCounts(MicrofrontendScope scope) async {
  await data.loadLibrary();
  if (scope.isDisposed) return null;
  return data.notificationsRepositoryOf(scope).watchUnreadCount();
}
