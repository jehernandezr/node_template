import 'package:shell_core/shell_core.dart';

import 'fake_notifications_repository.dart';
import 'notifications_repository.dart';

/// How the notifications repository is created. The backend has no
/// notifications contract yet, so it only serves the demo mode. The lifecycle
/// and the screens resolve the same binding, so they share one instance per
/// identity.
abstract final class NotificationsData {
  static final RepositoryBinding<NotificationsRepository> repository =
      RepositoryBinding<NotificationsRepository>.demoOnly(
        demo: (services) =>
            FakeNotificationsRepository(behavior: DemoBehavior()),
      );
}
