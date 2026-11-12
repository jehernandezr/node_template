import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

import 'support/fakes.dart';

final class _Ping extends ShellEvent {
  const _Ping();
}

/// Lifecycle that keeps its context, so a test can emit through it later.
final class _Holder extends Microfrontend {
  _Holder(this.created);

  final List<_Holder> created;
  ShellContext? context;
  int pings = 0;

  @override
  Future<void> initialize(ShellContext context) async {
    created.add(this);
    this.context = context;
    context.listen<_Ping>((_) => pings++);
  }
}

/// Lifecycle whose first [failures] initializations throw.
final class _Flaky extends Microfrontend {
  _Flaky(this.attempts, {required this.failures});

  final List<int> attempts;
  final int failures;

  @override
  Future<void> initialize(ShellContext context) async {
    attempts.add(attempts.length + 1);
    if (attempts.length <= failures) throw StateError('backend down');
  }
}

/// Resource that records how it was released.
final class _Resource implements ScopedResource {
  _Resource(this.log, this.name);

  final List<String> log;
  final String name;

  @override
  Future<void> dispose() async {
    await Future<void>.delayed(Duration.zero);
    log.add('dispose $name');
  }
}

UserSession _user(String id) => UserSession(
  userId: id,
  tenantId: 't1',
  permissions: {Permission.tasksRead},
);

/// Collects errors reported with FlutterError while the test runs.
List<FlutterErrorDetails> _captureErrors() {
  final errors = <FlutterErrorDetails>[];
  final previous = FlutterError.onError;
  FlutterError.onError = errors.add;
  addTearDown(() => FlutterError.onError = previous);
  return errors;
}

void main() {
  group('ShellContext.emit and identity rotation', () {
    late ValueNotifier<UserSession> session;
    late List<_Holder> created;
    late ShellRuntime runtime;

    setUp(() {
      session = ValueNotifier(_user('u1'));
      created = [];
      final registry = MicrofrontendRegistry()
        ..register(
          fakeManifest(
            id: MicrofrontendId.notifications,
            access: AccessRule.authenticated(),
            lifecycleFactory: () => _Holder(created),
          ),
        );
      runtime = fakeRuntime(registry: registry, session: session);
    });

    tearDown(() => runtime.dispose());

    test('emit publishes while the context is active', () async {
      await runtime.start();
      final received = <int>[];
      final sub = runtime.eventBus.on<UnreadCountChanged>().listen(
        (e) => received.add(e.count),
      );
      created.single.context!.emit(const UnreadCountChanged(2));
      await Future<void>.delayed(Duration.zero);
      expect(received, [2]);
      await sub.cancel();
    });

    test(
      'the previous user\'s late emit never reaches the next user',
      () async {
        await runtime.start();
        final previous = created.single.context!;

        session.value = _user('u2');
        // Cancelled synchronously, before any queued sync runs.
        expect(previous.isDisposed, isTrue);

        previous.emit(const UnreadCountChanged(9));
        await runtime.whenIdle();
        previous.emit(const UnreadCountChanged(9));

        final replayed = <int>[];
        final sub = runtime.eventBus
            .on<UnreadCountChanged>(replay: true)
            .listen((e) => replayed.add(e.count));
        await Future<void>.delayed(Duration.zero);
        expect(replayed, isEmpty);
        await sub.cancel();
      },
    );

    test('listeners of the previous context stop on rotation', () async {
      await runtime.start();
      final first = created.single;
      session.value = _user('u2');
      runtime.eventBus.emit(const _Ping());
      await runtime.whenIdle();
      await Future<void>.delayed(Duration.zero);
      expect(first.pings, 0);
    });

    test('identityEpoch increments on user changes only', () async {
      await runtime.start();
      expect(runtime.identityEpoch.value, 0);
      session.value = UserSession(
        userId: 'u1',
        tenantId: 't1',
        permissions: {Permission.tasksRead, Permission.tasksWrite},
      );
      expect(runtime.identityEpoch.value, 0);
      session.value = _user('u2');
      expect(runtime.identityEpoch.value, 1);
      session.value = UserSession.anonymous();
      expect(runtime.identityEpoch.value, 2);
    });
  });

  group('lifecycleFactory', () {
    test('every runtime and every activation gets its own instance', () async {
      final created = <_Holder>[];
      final registry = MicrofrontendRegistry()
        ..register(
          fakeManifest(
            id: MicrofrontendId.notifications,
            access: AccessRule.authenticated(),
            lifecycleFactory: () => _Holder(created),
          ),
        );
      final sessionA = ValueNotifier(_user('a'));
      final sessionB = ValueNotifier(_user('b'));
      final runtimeA = fakeRuntime(registry: registry, session: sessionA);
      final runtimeB = fakeRuntime(registry: registry, session: sessionB);
      addTearDown(runtimeA.dispose);
      addTearDown(runtimeB.dispose);

      await runtimeA.start();
      await runtimeB.start();
      expect(created, hasLength(2));
      expect(created[0], isNot(same(created[1])));

      sessionA.value = _user('a2');
      await runtimeA.whenIdle();
      expect(created, hasLength(3));
      expect(created[2].context!.session().userId, 'a2');
      expect(created[1].context!.isDisposed, isFalse, reason: 'B untouched');
    });
  });

  group('lifecycle retry', () {
    test('a failed initialize is retried after the backoff', () async {
      final errors = _captureErrors();
      final attempts = <int>[];
      final failures = <int>[];
      final registry = MicrofrontendRegistry()
        ..register(
          fakeManifest(
            id: MicrofrontendId.notifications,
            access: AccessRule.authenticated(),
            lifecycleFactory: () => _Flaky(attempts, failures: 2),
          ),
        );
      final session = ValueNotifier(_user('u1'));
      final runtime = ShellRuntime(
        registry: registry,
        platform: AppPlatform.web,
        session: session,
        servicesFactory: (identity) =>
            DefaultShellServices(session: identity, eventBus: ShellEventBus()),
        lifecycleRetryDelay: (count) {
          failures.add(count);
          return const Duration(milliseconds: 5);
        },
      );
      addTearDown(runtime.dispose);

      await runtime.start();
      expect(attempts, [1]);
      expect(runtime.activeIds, isEmpty);
      expect(errors, hasLength(1));

      for (var i = 0; i < 20 && runtime.activeIds.isEmpty; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 10));
        await runtime.whenIdle();
      }
      expect(attempts, [1, 2, 3]);
      expect(failures, [1, 2], reason: 'the backoff grows with each failure');
      expect(runtime.activeIds, {MicrofrontendId.notifications});
    });

    test(
      'syncs inside the backoff do not retry; a new identity does',
      () async {
        _captureErrors();
        final attempts = <int>[];
        final registry = MicrofrontendRegistry()
          ..register(
            fakeManifest(
              id: MicrofrontendId.notifications,
              access: AccessRule.authenticated(),
              lifecycleFactory: () => _Flaky(attempts, failures: 1),
            ),
          );
        final session = ValueNotifier(_user('u1'));
        final runtime = ShellRuntime(
          registry: registry,
          platform: AppPlatform.web,
          session: session,
          servicesFactory: (identity) => DefaultShellServices(
            session: identity,
            eventBus: ShellEventBus(),
          ),
          lifecycleRetryDelay: (_) => const Duration(hours: 1),
        );
        addTearDown(runtime.dispose);

        await runtime.start();
        session.value = UserSession(
          userId: 'u1',
          tenantId: 't1',
          permissions: {Permission.tasksRead, Permission.tasksWrite},
        );
        await runtime.whenIdle();
        expect(attempts, [1], reason: 'still inside the backoff');

        session.value = _user('u2');
        await runtime.whenIdle();
        expect(attempts, [1, 2]);
        expect(runtime.activeIds, {MicrofrontendId.notifications});
      },
    );

    test('defaultLifecycleRetryDelay doubles up to five minutes', () {
      expect(defaultLifecycleRetryDelay(1), const Duration(seconds: 1));
      expect(defaultLifecycleRetryDelay(2), const Duration(seconds: 2));
      expect(defaultLifecycleRetryDelay(4), const Duration(seconds: 8));
      expect(defaultLifecycleRetryDelay(30), const Duration(minutes: 5));
    });
  });

  group('ScopedResource', () {
    test('the scope disposes resources it created, in reverse order', () async {
      final log = <String>[];
      final scope = MicrofrontendScope(
        DefaultShellServices(session: _user('u1'), eventBus: ShellEventBus()),
      );
      scope.get<_Resource>((_) => _Resource(log, 'first'));
      scope.get<Object>((_) => Object());
      scope.get<ScopedResource>((_) => _Resource(log, 'second'));

      await scope.dispose();
      expect(log, ['dispose second', 'dispose first']);
      expect(scope.isDisposed, isTrue);
    });

    test('an explicit dispose callback wins over ScopedResource', () async {
      final log = <String>[];
      final scope = MicrofrontendScope(
        DefaultShellServices(session: _user('u1'), eventBus: ShellEventBus()),
      );
      scope.get<_Resource>(
        (_) => _Resource(log, 'auto'),
        dispose: (resource) => log.add('callback ${resource.name}'),
      );
      await scope.dispose();
      expect(log, ['callback auto']);
    });

    test(
      'an identity change disposes the resources of the previous user',
      () async {
        final log = <String>[];
        final session = ValueNotifier(_user('u1'));
        final registry = MicrofrontendRegistry()
          ..register(fakeManifest(id: MicrofrontendId.notifications));
        final runtime = fakeRuntime(registry: registry, session: session);
        addTearDown(runtime.dispose);

        runtime
            .scopeFor(MicrofrontendId.notifications)
            .get<_Resource>(
              (services) => _Resource(log, services.session.userId!),
            );
        session.value = _user('u2');
        await Future<void>.delayed(Duration.zero);
        await Future<void>.delayed(Duration.zero);
        expect(log, ['dispose u1']);
      },
    );

    test(
      'a failing resource is reported and the others still dispose',
      () async {
        final errors = _captureErrors();
        final log = <String>[];
        final scope = MicrofrontendScope(
          DefaultShellServices(session: _user('u1'), eventBus: ShellEventBus()),
        );
        scope.get<_Resource>((_) => _Resource(log, 'ok'));
        scope.get<_Broken>((_) => _Broken());
        await scope.dispose();
        expect(log, ['dispose ok']);
        expect(errors, hasLength(1));
      },
    );
  });
}

final class _Broken implements ScopedResource {
  @override
  Future<void> dispose() async => throw StateError('cannot close');
}
