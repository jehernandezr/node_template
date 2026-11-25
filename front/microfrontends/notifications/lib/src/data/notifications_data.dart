import 'package:http/http.dart' as http;
import 'package:shell_core/shell_core.dart';

import 'api_notifications_repository.dart';
import 'fake_notifications_repository.dart';
import 'notifications_repository.dart';
import 'sse_notifications_stream.dart';

/// How the notifications repository is created for each shell mode: in
/// memory in demo, over the API and its server-sent events in live. The
/// lifecycle and the screens resolve the same binding, so they share one
/// instance, and one connection, per identity.
abstract final class NotificationsData {
  static final RepositoryBinding<NotificationsRepository> repository =
      RepositoryBinding<NotificationsRepository>(
        demo: (services) =>
            FakeNotificationsRepository(behavior: DemoBehavior()),
        live: (services) => ApiNotificationsRepository(
          client: services.api,
          stream: SseNotificationsStream(
            client: services.api,
            httpClient: http.Client(),
          ),
        ),
      );
}
