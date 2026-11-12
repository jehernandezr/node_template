import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  test('manifest id matches package', () {
    expect(notificationsManifest.id, MicrofrontendId.notifications);
  });

  test('routes live under /notifications with preferences nested', () {
    final routes = notificationsManifest.routes(
      deferredPage,
      () => throw StateError('unused'),
    );
    final inbox = routes.single as GoRoute;
    expect(inbox.path, '/notifications');
    final preferences = inbox.routes.single as GoRoute;
    expect(preferences.path, 'preferences');
  });

  test('the lifecycle is eager and provided by the manifest', () {
    expect(notificationsManifest.lifecycle, isA<NotificationsLifecycle>());
  });
}
