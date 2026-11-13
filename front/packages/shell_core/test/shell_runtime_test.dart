import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

import 'support/fakes.dart';

final class _Ping extends ShellEvent {
  const _Ping();
}

/// Records lifecycle calls and counts pings received through the context.
class _Probe extends Microfrontend {
  _Probe(this.name, this.log);

  final String name;
  final List<String> log;
  int pings = 0;
  ShellContext? context;

  @override
  Future<void> initialize(ShellContext context) async {
    log.add('init $name');
    this.context = context;
    context.listen<_Ping>((_) => pings++);
  }

  @override
  Future<void> dispose() async {
    log.add('dispose $name');
  }
}

/// Lifecycle that records the user of its scope and, with [gate], waits in
/// `initialize` until the test releases it.
class _Recorder extends Microfrontend {
  _Recorder(this.name, this.log, {this.gate});

  final String name;
  final List<String> log;
  final Completer<void>? gate;

  @override
  Future<void> initialize(ShellContext context) async {
    log.add('init $name for ${context.scope?.services.session.userId}');
    await gate?.future;
  }

  @override
  Future<void> dispose() async {}
}

/// Object held in a scope; records whether its scope disposed it.
final class _Repo {
  _Repo(this.owner);

  final String owner;
  bool disposed = false;
}

UserSession _user(
  String user,
  String tenant, {
  Set<Permission> permissions = const {},
}) => UserSession(userId: user, tenantId: tenant, permissions: permissions);

void main() {
  late List<String> log;
  late ValueNotifier<UserSession> session;
  late _Probe tasksProbe;
  late MicrofrontendRegistry registry;
  late ShellRuntime runtime;

  setUp(() {
    log = [];
    session = ValueNotifier(
      _user('u1', 't1', permissions: {Permission.tasksRead}),
    );
    tasksProbe = _Probe('tasks', log);
    registry = MicrofrontendRegistry()
      ..register(fakeManifest(id: MicrofrontendId.account))
      ..register(
        fakeManifest(
          id: MicrofrontendId.tasks,
          access: AccessRule.permissions([Permission.tasksRead]),
          lifecycleFactory: () => tasksProbe,
        ),
      )
      ..register(
        fakeManifest(
          id: MicrofrontendId.backoffice,
          access: AccessRule.permissions([Permission.backofficeAccess]),
          lifecycleFactory: () => _Probe('backoffice', log),
        ),
      );
    runtime = fakeRuntime(registry: registry, session: session);
  });

  tearDown(() async {
    await runtime.dispose();
  });

  test('a sync queued before dispose does not run after it', () async {
    final errors = <FlutterErrorDetails>[];
    final previous = FlutterError.onError;
    FlutterError.onError = errors.add;
    addTearDown(() => FlutterError.onError = previous);

    // Queue a start and an identity change, then dispose before they drain.
    unawaited(runtime.start());
    session.value = _user('u2', 't1', permissions: {Permission.tasksRead});
    await runtime.dispose();
    await runtime.whenIdle();

    expect(errors, isEmpty);
  });

  test('initializes visible lifecycles on start, not hidden ones', () async {
    await runtime.start();
    expect(log, ['init tasks']);
    expect(runtime.activeIds, {MicrofrontendId.tasks});
  });

  test(
    'user switch disposes and reinitializes the active microfrontends',
    () async {
      await runtime.start();
      session.value = _user('u2', 't1', permissions: {Permission.tasksRead});
      await runtime.whenIdle();
      expect(log, ['init tasks', 'dispose tasks', 'init tasks']);
    },
  );

  test('tenant switch counts as a user switch', () async {
    await runtime.start();
    session.value = _user('u1', 't2', permissions: {Permission.tasksRead});
    await runtime.whenIdle();
    expect(log, ['init tasks', 'dispose tasks', 'init tasks']);
  });

  test('sign-out disposes everything that needs a user', () async {
    await runtime.start();
    session.value = UserSession.anonymous();
    await runtime.whenIdle();
    expect(log, ['init tasks', 'dispose tasks']);
    expect(runtime.activeIds, isEmpty);
  });

  test('permission change initializes newly visible ones without touching the others', () async {
    await runtime.start();
    session.value = _user(
      'u1',
      't1',
      permissions: {Permission.tasksRead, Permission.backofficeAccess},
    );
    await runtime.whenIdle();
    expect(log, ['init tasks', 'init backoffice']);

    session.value = _user(
      'u1',
      't1',
      permissions: {Permission.backofficeAccess},
    );
    await runtime.whenIdle();
    expect(log, ['init tasks', 'init backoffice', 'dispose tasks']);
  });

  test('a session that changes only features does not re-initialize', () async {
    await runtime.start();
    session.value = _user(
      'u1',
      't1',
      permissions: {Permission.tasksRead},
    ); // equal: no notification
    session.value = UserSession(
      userId: 'u1',
      tenantId: 't1',
      permissions: {Permission.tasksRead},
      featureFlags: {FeatureFlag.newReports},
    );
    await runtime.whenIdle();
    expect(log, ['init tasks']);
  });

  test(
    'subscriptions are cancelled when the microfrontend is disposed',
    () async {
      await runtime.start();
      runtime.eventBus.emit(const _Ping());
      await Future<void>.delayed(Duration.zero);
      expect(tasksProbe.pings, 1);

      // Same instance is re-initialized after a user switch, adding a new subscription.
      session.value = _user('u2', 't1', permissions: {Permission.tasksRead});
      await runtime.whenIdle();
      runtime.eventBus.emit(const _Ping());
      await Future<void>.delayed(Duration.zero);
      expect(tasksProbe.pings, 2, reason: 'one live subscription, not two');
      expect(tasksProbe.context!.isDisposed, isFalse);
    },
  );

  test('a disposed context refuses new listeners', () async {
    await runtime.start();
    final old = tasksProbe.context!;
    session.value = UserSession.anonymous();
    await runtime.whenIdle();
    expect(old.isDisposed, isTrue);
    expect(() => old.listen<_Ping>((_) {}), throwsStateError);
  });

  test('dispose tears down active microfrontends', () async {
    await runtime.start();
    await runtime.dispose();
    expect(log, ['init tasks', 'dispose tasks']);
  });

  test('scope instance is reused within an identity and recreated after a user change', () async {
    await runtime.start();
    final scopeA = runtime.scopeFor(MicrofrontendId.tasks);
    final first = scopeA.get<_Repo>(
      (services) => _Repo(services.session.userId!),
      dispose: (r) => r.disposed = true,
    );
    expect(runtime.scopeFor(MicrofrontendId.tasks), same(scopeA));
    expect(scopeA.get<_Repo>((_) => _Repo('never')), same(first));
    expect(first.owner, 'u1');

    session.value = _user('u2', 't1', permissions: {Permission.tasksRead});
    await runtime.whenIdle();
    final scopeB = runtime.scopeFor(MicrofrontendId.tasks);
    expect(scopeB, isNot(same(scopeA)));
    expect(first.disposed, isTrue);

    final second = scopeB.get<_Repo>(
      (services) => _Repo(services.session.userId!),
    );
    expect(second, isNot(same(first)));
    expect(second.owner, 'u2');
    expect(scopeB.services.session.userId, 'u2');
  });

  test('a permission-only change keeps the same scope', () async {
    await runtime.start();
    final scope = runtime.scopeFor(MicrofrontendId.tasks);
    session.value = _user(
      'u1',
      't1',
      permissions: {Permission.tasksRead, Permission.backofficeAccess},
    );
    await runtime.whenIdle();
    expect(runtime.scopeFor(MicrofrontendId.tasks), same(scope));
  });

  test('scopeFor rejects unregistered microfrontends', () {
    expect(() => runtime.scopeFor(MicrofrontendId.billing), throwsStateError);
  });

  test(
    'identity change clears replayable events; a permission change keeps them',
    () async {
      await runtime.start();
      runtime.eventBus.emit(const UnreadCountChanged(3));

      session.value = _user(
        'u1',
        't1',
        permissions: {Permission.tasksRead, Permission.backofficeAccess},
      );
      await runtime.whenIdle();
      final kept = <int>[];
      final keptSub = runtime.eventBus
          .on<UnreadCountChanged>(replay: true)
          .listen((e) => kept.add(e.count));
      await Future<void>.delayed(Duration.zero);
      expect(kept, [3]);
      await keptSub.cancel();

      session.value = _user('u2', 't1', permissions: {Permission.tasksRead});
      await runtime.whenIdle();
      final replayed = <int>[];
      final sub = runtime.eventBus
          .on<UnreadCountChanged>(replay: true)
          .listen((e) => replayed.add(e.count));
      await Future<void>.delayed(Duration.zero);
      expect(replayed, isEmpty);
      await sub.cancel();
    },
  );

  test('dispose disposes the scopes', () async {
    await runtime.start();
    final repo = runtime
        .scopeFor(MicrofrontendId.tasks)
        .get<_Repo>((s) => _Repo('u1'), dispose: (r) => r.disposed = true);
    await runtime.dispose();
    expect(repo.disposed, isTrue);
    expect(() => runtime.scopeFor(MicrofrontendId.tasks), throwsStateError);
  });

  test('an identity change during initialize does not start the rest of the '
      'old list for the new identity', () async {
    final initLog = <String>[];
    final gate = Completer<void>();
    final ordered = MicrofrontendRegistry()
      ..register(
        fakeManifest(
          id: MicrofrontendId.account,
          access: AccessRule.authenticated(),
          lifecycleFactory: () => _Recorder('account', initLog, gate: gate),
        ),
      )
      ..register(
        fakeManifest(
          id: MicrofrontendId.billing,
          access: AccessRule.permissions([Permission.billingRead]),
          lifecycleFactory: () => _Recorder('billing', initLog),
        ),
      );
    final identity = ValueNotifier(
      _user('a', 't1', permissions: {Permission.billingRead}),
    );
    final other = fakeRuntime(registry: ordered, session: identity);
    addTearDown(other.dispose);

    final starting = other.start();
    await pumpEventQueue();
    expect(initLog, ['init account for a']);

    identity.value = _user('b', 't1');
    gate.complete();
    await starting;
    await other.whenIdle();

    expect(initLog, ['init account for a', 'init account for b']);
    expect(other.activeIds, {MicrofrontendId.account});
  });
}
