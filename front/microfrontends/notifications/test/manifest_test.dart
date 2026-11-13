import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  test('manifest id matches the package', () {
    expect(notificationsManifest.id, MicrofrontendId.notifications);
    expect(notificationsManifest.platforms, {
      AppPlatform.web,
      AppPlatform.mobile,
    });
  });

  test('declares screens and no legacy routes', () {
    final legacy = notificationsManifest.buildRoutes(
      deferredPage,
      () => throw StateError('unused'),
    );
    expect(legacy, hasLength(notificationsManifest.screens.length));

    final inbox = notificationsManifest.screens.single;
    expect(inbox.path, NotificationsPaths.inbox);
    expect(inbox.path, '/notifications');
    final preferences = inbox.routes.single;
    expect(preferences.path, 'preferences');
    expect(NotificationsPaths.preferences, '/notifications/preferences');
  });

  test('buildRoutes nests preferences under the inbox', () {
    final routes = notificationsManifest.buildRoutes(
      deferredPage,
      () => throw StateError('unused'),
    );
    final inbox = routes.single as GoRoute;
    expect(inbox.path, '/notifications');
    final preferences = inbox.routes.single as GoRoute;
    expect(preferences.path, 'preferences');
  });

  test('the menu entry points at the inbox', () {
    final entry = notificationsManifest.menu.single;
    expect(entry.path, NotificationsPaths.inbox);
    expect(entry.labelKey, 'menuNotifications');
  });

  group('access', () {
    final signedIn = UserSession(userId: 'u1', tenantId: 't1');

    test('the manifest requires a signed-in user', () {
      expect(
        notificationsManifest.isVisibleTo(
          UserSession.anonymous(),
          AppPlatform.web,
        ),
        isFalse,
      );
      expect(
        notificationsManifest.isVisibleTo(signedIn, AppPlatform.web),
        isTrue,
      );
      expect(
        notificationsManifest.isVisibleTo(signedIn, AppPlatform.mobile),
        isTrue,
      );
    });

    test('sub-routes add no rule: every signed-in user owns their '
        'preferences', () {
      final inbox = notificationsManifest.screens.single;
      expect(inbox.access, isNull);
      expect(inbox.routes.single.access, isNull);
    });
  });

  group('lifecycle', () {
    test('uses lifecycleFactory', () {
      expect(notificationsManifest.lifecycleFactory, isNotNull);
      expect(notificationsManifest.hasLifecycle, isTrue);
    });

    test('each activation gets a new instance', () {
      final first = notificationsManifest.createLifecycle();
      final second = notificationsManifest.createLifecycle();
      expect(first, isA<NotificationsLifecycle>());
      expect(second, isA<NotificationsLifecycle>());
      expect(identical(first, second), isFalse);
    });
  });
}
