import 'package:shell_core/shell_core.dart';

// Diferido: el ciclo de vida viaja en el bundle inicial de web junto al
// manifiesto. El repositorio y sus datos solo se descargan al iniciar.
import '../data/notifications_scope.dart' deferred as data;

/// Carga la librería de datos y devuelve el contador de no leídas del
/// repositorio del [scope], o null si el scope se cerró mientras cargaba.
Future<Stream<int>?> loadUnreadCounts(MicrofrontendScope scope) async {
  await data.loadLibrary();
  if (scope.isDisposed) return null;
  return data.notificationsRepositoryOf(scope).watchUnreadCount();
}
