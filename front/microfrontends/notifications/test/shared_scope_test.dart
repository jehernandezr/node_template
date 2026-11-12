import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:mf_notifications/src/data/notifications_scope.dart';
import 'package:mf_notifications/src/screens/screens.dart';
import 'package:shell_core/shell_core.dart';

import 'support/test_app.dart';

AppNotification _item(String id) => AppNotification(
  id: id,
  type: NotificationType.taskUpdated,
  title: 'Título $id',
  body: 'Cuerpo $id',
  createdAt: DateTime(2026, 11, 10),
);

MicrofrontendScope _scope(ShellEventBus bus) => MicrofrontendScope(
  DefaultShellServices(session: UserSession.anonymous(), eventBus: bus),
);

void main() {
  testWidgets(
    'marking all read on the screen emits UnreadCountChanged(0) through the lifecycle',
    (tester) async {
      final bus = ShellEventBus();
      addTearDown(bus.dispose);
      final scope = _scope(bus);
      addTearDown(scope.dispose);
      // Mismo scope para el lifecycle y la pantalla: deben compartir repositorio.
      final repo = scope.get<NotificationsRepository>(
        (_) => FakeNotificationsRepository(seed: [_item('a'), _item('b')]),
      ) as FakeNotificationsRepository;
      addTearDown(repo.close);

      final counts = <int>[];
      final subscription = bus.on<UnreadCountChanged>().listen(
        (e) => counts.add(e.count),
      );
      addTearDown(subscription.cancel);

      await NotificationsLifecycle().initialize(
        ShellContext(
          eventBus: bus,
          session: UserSession.anonymous,
          scope: scope,
        ),
      );
      await tester.pumpWidget(testApp(buildInboxScreen(scope)));
      await tester.pumpAndSettle();
      expect(counts, [2]);

      await tester.tap(find.text(esText.markAllRead));
      await tester.pumpAndSettle();
      expect(counts, [2, 0]);
      expect(identical(notificationsRepositoryOf(scope), repo), isTrue);
    },
  );

  test('a fresh scope has fresh state', () async {
    final bus = ShellEventBus();
    addTearDown(bus.dispose);
    final first = _scope(bus);
    final second = _scope(bus);
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

  test('the Spanish strings come from NotificationsLocalizations', () {
    expect(esText.inboxTitle, 'Notificaciones');
    expect(esText.markAllRead, 'Marcar todas como leídas');
    expect(esText.typeLabel(NotificationType.taskUpdated), 'Tareas');
    expect(esText.channelLabel(NotificationChannel.email), 'Correo');
  });
}
