import 'dart:async';

import 'package:shell_core/shell_core.dart';

import 'fake_notifications_repository.dart';
import 'notifications_repository.dart';

/// Fábrica del repositorio de una identidad. Es la única: el lifecycle y las
/// pantallas la piden al mismo scope, así comparten instancia.
NotificationsRepository createNotificationsRepository(ShellServices services) =>
    FakeNotificationsRepository();

void _disposeRepository(NotificationsRepository repository) {
  if (repository is FakeNotificationsRepository) unawaited(repository.close());
}

/// Repositorio del [scope]: una instancia por identidad, liberada con el scope.
NotificationsRepository notificationsRepositoryOf(MicrofrontendScope scope) =>
    scope.get<NotificationsRepository>(
      createNotificationsRepository,
      dispose: _disposeRepository,
    );
