import 'package:shell_core/shell_core.dart';

import 'fake_notifications_repository.dart';
import 'notifications_repository.dart';

/// Fábrica del repositorio de una identidad. Es la única: el ciclo de vida y
/// las pantallas lo piden al mismo scope, así comparten instancia.
NotificationsRepository createNotificationsRepository(ShellServices services) =>
    FakeNotificationsRepository();

/// Repositorio del [scope]: una instancia por identidad. El scope lo cierra
/// al liberarse porque es un [ScopedResource].
NotificationsRepository notificationsRepositoryOf(MicrofrontendScope scope) =>
    scope.get<NotificationsRepository>(createNotificationsRepository);
