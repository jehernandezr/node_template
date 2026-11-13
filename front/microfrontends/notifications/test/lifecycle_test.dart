import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:mf_notifications/src/data/notifications_scope.dart';
import 'package:shell_core/shell_core.dart';

import 'support/test_app.dart';

/// Scope con un repositorio sembrado. El lifecycle obtiene la misma instancia.
FakeNotificationsRepository _seededRepo(
  MicrofrontendScope scope,
  List<AppNotification> seed,
) => scope.get<NotificationsRepository>(
  (_) => FakeNotificationsRepository(seed: seed),
) as FakeNotificationsRepository;

ShellContext _context(ShellEventBus bus, MicrofrontendScope scope) =>
    ShellContext(eventBus: bus, session: UserSession.anonymous, scope: scope);

/// Repositorio cuyo contador controla la prueba. El resto de la interfaz no se
/// usa aquí.
final class _ManualCountRepository implements NotificationsRepository {
  final StreamController<int> counts = StreamController<int>.broadcast();

  @override
  Stream<int> watchUnreadCount() => counts.stream;

  @override
  Future<void> dispose() => counts.close();

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnimplementedError('${invocation.memberName}');
}

UserSession _user(String id) => UserSession(userId: id, tenantId: 't1');

void main() {
  late ShellEventBus bus;
  late MicrofrontendScope scope;

  setUp(() {
    bus = ShellEventBus();
    scope = testScope(bus: bus);
    addTearDown(bus.dispose);
    addTearDown(scope.dispose);
  });

  test('emits the unread count on start and after each live item', () async {
    final repo = _seededRepo(scope, [
      notificationItem('a'),
      notificationItem('b'),
    ]);
    final lifecycle = NotificationsLifecycle();

    final counts = <int>[];
    final subscription = bus.on<UnreadCountChanged>().listen(
      (e) => counts.add(e.count),
    );
    addTearDown(subscription.cancel);

    await lifecycle.initialize(_context(bus, scope));
    await Future<void>.delayed(Duration.zero);
    expect(counts, [2]);

    repo.push(notificationItem('live'));
    await Future<void>.delayed(Duration.zero);
    expect(counts, [2, 3]);

    await lifecycle.dispose();
    repo.push(notificationItem('after'));
    await Future<void>.delayed(Duration.zero);
    expect(counts, [2, 3]);
  });

  test('a late listener receives the replayed unread count', () async {
    _seededRepo(scope, [notificationItem('a')]);
    final lifecycle = NotificationsLifecycle();
    addTearDown(lifecycle.dispose);

    await lifecycle.initialize(_context(bus, scope));
    await Future<void>.delayed(Duration.zero);

    final replayed = await bus.on<UnreadCountChanged>(replay: true).first;
    expect(replayed.count, 1);
  });

  test('marking items as read emits the new unread count', () async {
    final repo = _seededRepo(scope, [
      notificationItem('a'),
      notificationItem('b', read: true),
    ]);
    final lifecycle = NotificationsLifecycle();
    addTearDown(lifecycle.dispose);

    final counts = <int>[];
    final subscription = bus.on<UnreadCountChanged>().listen(
      (e) => counts.add(e.count),
    );
    addTearDown(subscription.cancel);
    await lifecycle.initialize(_context(bus, scope));
    await Future<void>.delayed(Duration.zero);

    await repo.markAllAsRead();
    await Future<void>.delayed(Duration.zero);
    expect(counts, [1, 0]);
  });

  test('a late emit after the context is disposed is dropped', () async {
    final repo = _ManualCountRepository();
    scope.get<NotificationsRepository>((_) => repo);
    final lifecycle = NotificationsLifecycle();
    addTearDown(lifecycle.dispose);
    final context = _context(bus, scope);

    final counts = <int>[];
    final subscription = bus.on<UnreadCountChanged>().listen(
      (e) => counts.add(e.count),
    );
    addTearDown(subscription.cancel);

    await lifecycle.initialize(context);
    repo.counts.add(4);
    await Future<void>.delayed(Duration.zero);
    expect(counts, [4]);

    // El runtime cancela el contexto antes de liberar el lifecycle: un valor
    // que llega en ese intervalo no puede salir al bus.
    await context.dispose();
    repo.counts.add(7);
    await Future<void>.delayed(Duration.zero);
    expect(counts, [4]);
    final replayed = await bus.on<UnreadCountChanged>(replay: true).first;
    expect(replayed.count, 4);
  });

  test('initialize on a context disposed meanwhile subscribes to nothing', () {
    final repo = _ManualCountRepository();
    scope.get<NotificationsRepository>((_) => repo);
    final context = _context(bus, scope);
    final lifecycle = NotificationsLifecycle();
    addTearDown(lifecycle.dispose);

    return Future.wait([lifecycle.initialize(context), context.dispose()])
        .then((_) => expect(repo.counts.hasListener, isFalse));
  });

  test('without a scope initialize fails, so the runtime retries', () {
    expect(
      NotificationsLifecycle().initialize(
        ShellContext(eventBus: bus, session: UserSession.anonymous),
      ),
      throwsStateError,
    );
  });

  group('with the shell runtime', () {
    late ValueNotifier<UserSession> session;
    late ShellRuntime runtime;

    setUp(() {
      session = ValueNotifier(_user('u1'));
      final registry = MicrofrontendRegistry()..register(notificationsManifest);
      late final ShellRuntime created;
      created = ShellRuntime(
        registry: registry,
        platform: AppPlatform.web,
        session: session,
        servicesFactory: (s) =>
            DefaultShellServices(session: s, eventBus: created.eventBus),
      );
      runtime = created;
      addTearDown(runtime.dispose);
    });

    FakeNotificationsRepository seedFor(List<AppNotification> seed) =>
        _seededRepo(runtime.scopeFor(MicrofrontendId.notifications), seed);

    Future<List<int>> replayedCounts() async {
      final counts = <int>[];
      final subscription = runtime.eventBus
          .on<UnreadCountChanged>(replay: true)
          .listen((e) => counts.add(e.count));
      await Future<void>.delayed(Duration.zero);
      await subscription.cancel();
      return counts;
    }

    test('a new identity never sees the previous user\'s count', () async {
      final first = seedFor([
        notificationItem('a'),
        notificationItem('b'),
        notificationItem('c'),
      ]);
      await runtime.start();
      await Future<void>.delayed(Duration.zero);
      expect(await replayedCounts(), [3]);

      session.value = _user('u2');
      // La rotación es síncrona: el scope y el replay de u1 ya no existen.
      final second = seedFor(const []);
      expect(identical(first, second), isFalse);
      expect(first.isDisposed, isTrue);
      expect(await replayedCounts(), isNot(contains(3)));
      await runtime.whenIdle();
      await Future<void>.delayed(Duration.zero);
      expect(await replayedCounts(), [0]);

      // El repositorio cerrado de u1 ya no puede mover el contador de u2.
      first.push(notificationItem('late'));
      await Future<void>.delayed(Duration.zero);
      expect(await replayedCounts(), [0]);
    });

    test('signing out clears the badge and closes the repository', () async {
      final repo = seedFor([notificationItem('a')]);
      await runtime.start();
      await Future<void>.delayed(Duration.zero);
      expect(await replayedCounts(), [1]);

      session.value = UserSession.anonymous();
      await runtime.whenIdle();
      await Future<void>.delayed(Duration.zero);

      expect(await replayedCounts(), isEmpty);
      expect(runtime.activeIds, isEmpty);
      expect(repo.isDisposed, isTrue);
    });

    test('screens and lifecycle share the repository of the scope', () async {
      await runtime.start();
      final scope = runtime.scopeFor(MicrofrontendId.notifications);
      await notificationsRepositoryOf(scope).markAllAsRead();
      await Future<void>.delayed(Duration.zero);
      final counts = await replayedCounts();
      expect(counts.last, 0);
    });
  });
}
