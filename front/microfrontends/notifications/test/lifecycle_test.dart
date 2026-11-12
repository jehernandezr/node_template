import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:shell_core/shell_core.dart';

AppNotification _item(String id, {bool read = false}) => AppNotification(
  id: id,
  type: NotificationType.accountActivity,
  title: 'Título $id',
  body: 'Cuerpo $id',
  createdAt: DateTime(2026, 11, 10),
  read: read,
);

/// Scope con un repositorio sembrado. El lifecycle obtiene la misma instancia.
FakeNotificationsRepository _seededRepo(
  MicrofrontendScope scope,
  List<AppNotification> seed,
) => scope.get<NotificationsRepository>(
  (_) => FakeNotificationsRepository(seed: seed),
) as FakeNotificationsRepository;

ShellContext _context(ShellEventBus bus, MicrofrontendScope scope) =>
    ShellContext(eventBus: bus, session: UserSession.anonymous, scope: scope);

void main() {
  test('emits the unread count on start and after each live item', () async {
    final bus = ShellEventBus();
    addTearDown(bus.dispose);
    final scope = MicrofrontendScope(
      DefaultShellServices(session: UserSession.anonymous(), eventBus: bus),
    );
    addTearDown(scope.dispose);
    final repo = _seededRepo(scope, [_item('a'), _item('b')]);
    addTearDown(repo.close);
    final lifecycle = NotificationsLifecycle();

    final counts = <int>[];
    final subscription = bus.on<UnreadCountChanged>().listen(
      (e) => counts.add(e.count),
    );
    addTearDown(subscription.cancel);

    await lifecycle.initialize(_context(bus, scope));
    await Future<void>.delayed(Duration.zero);
    expect(counts, [2]);

    repo.push(_item('live'));
    await Future<void>.delayed(Duration.zero);
    expect(counts, [2, 3]);

    await lifecycle.dispose();
    repo.push(_item('after'));
    await Future<void>.delayed(Duration.zero);
    expect(counts, [2, 3]);
  });

  test('a late listener receives the replayed unread count', () async {
    final bus = ShellEventBus();
    addTearDown(bus.dispose);
    final scope = MicrofrontendScope(
      DefaultShellServices(session: UserSession.anonymous(), eventBus: bus),
    );
    addTearDown(scope.dispose);
    final repo = _seededRepo(scope, [_item('a')]);
    addTearDown(repo.close);

    await NotificationsLifecycle().initialize(_context(bus, scope));
    await Future<void>.delayed(Duration.zero);

    final replayed = await bus.on<UnreadCountChanged>(replay: true).first;
    expect(replayed.count, 1);
  });

  test('marking items as read emits the new unread count', () async {
    final bus = ShellEventBus();
    addTearDown(bus.dispose);
    final scope = MicrofrontendScope(
      DefaultShellServices(session: UserSession.anonymous(), eventBus: bus),
    );
    addTearDown(scope.dispose);
    final repo = _seededRepo(scope, [_item('a'), _item('b', read: true)]);
    addTearDown(repo.close);

    final counts = <int>[];
    final subscription = bus.on<UnreadCountChanged>().listen(
      (e) => counts.add(e.count),
    );
    addTearDown(subscription.cancel);
    await NotificationsLifecycle().initialize(_context(bus, scope));
    await Future<void>.delayed(Duration.zero);

    await repo.markAllAsRead();
    await Future<void>.delayed(Duration.zero);
    expect(counts, [1, 0]);
  });
}
