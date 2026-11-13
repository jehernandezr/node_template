import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:mf_notifications/src/data/notifications_scope.dart';
import 'package:mf_notifications/src/screens/screens.dart';
import 'package:shell_core/shell_core.dart';

import 'support/test_app.dart';

void main() {
  testWidgets(
    'marking all read on the screen emits UnreadCountChanged(0) through the lifecycle',
    (tester) async {
      final bus = ShellEventBus();
      addTearDown(bus.dispose);
      final scope = testScope(bus: bus);
      addTearDown(scope.dispose);
      // Mismo scope para el lifecycle y la pantalla: deben compartir repositorio.
      final repo = scope.get<NotificationsRepository>(
        (_) => FakeNotificationsRepository(
          seed: [notificationItem('a'), notificationItem('b')],
        ),
      ) as FakeNotificationsRepository;

      final counts = <int>[];
      final subscription = bus.on<UnreadCountChanged>().listen(
        (e) => counts.add(e.count),
      );
      addTearDown(subscription.cancel);

      final lifecycle = NotificationsLifecycle();
      addTearDown(lifecycle.dispose);
      // initialize descarga la librería de datos diferida: termina mientras
      // el reloj de la prueba avanza, así que se espera después de pumpear.
      final initialized = lifecycle.initialize(
        ShellContext(
          eventBus: bus,
          session: UserSession.anonymous,
          scope: scope,
        ),
      );
      await tester.pumpWidget(testApp(buildInboxScreen(scope)));
      await tester.pumpAndSettle();
      await initialized;
      await tester.pump();
      expect(counts, [2]);

      await tester.tap(find.text(esText.markAllRead));
      await tester.pumpAndSettle();
      expect(counts, [2, 0]);
      expect(identical(notificationsRepositoryOf(scope), repo), isTrue);
    },
  );

  test('a fresh scope does not see the data of another one', () async {
    final first = testScope();
    final second = testScope();
    addTearDown(first.dispose);
    addTearDown(second.dispose);

    await notificationsRepositoryOf(first).markAllAsRead();

    expect(await notificationsRepositoryOf(first).unreadCount(), 0);
    expect(await notificationsRepositoryOf(second).unreadCount(), 2);
    expect(
      identical(
        notificationsRepositoryOf(first),
        notificationsRepositoryOf(second),
      ),
      isFalse,
    );
  });

  group('disposing the scope', () {
    test('closes the repository without a dispose callback', () async {
      final scope = testScope();
      final repo =
          notificationsRepositoryOf(scope) as FakeNotificationsRepository;
      expect(repo, isA<ScopedResource>());
      expect(repo.isDisposed, isFalse);

      await scope.dispose();

      expect(repo.isDisposed, isTrue);
      expect(() => notificationsRepositoryOf(scope), throwsStateError);
    });

    test('ends the live and unread streams', () async {
      final scope = testScope();
      final repo = notificationsRepositoryOf(scope);
      final counts = <int>[];
      var countsDone = false;
      var liveDone = false;
      repo.watchUnreadCount().listen(
        counts.add,
        onDone: () => countsDone = true,
      );
      repo.live().listen((_) {}, onDone: () => liveDone = true);
      await Future<void>.delayed(Duration.zero);
      expect(counts, [2]);

      await scope.dispose();
      await Future<void>.delayed(Duration.zero);

      expect(countsDone, isTrue);
      expect(liveDone, isTrue);
      await repo.markAllAsRead();
      await Future<void>.delayed(Duration.zero);
      expect(counts, [2]);
    });
  });
}
