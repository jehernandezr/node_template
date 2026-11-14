import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

import 'support/fakes.dart';

final class _Client {
  _Client(this.name);

  final String name;
}

void main() {
  late ShellServices services;
  late MicrofrontendScope scope;

  setUp(() {
    services = ShellServices(
      mode: ShellMode.demo,
      session: UserSession(userId: 'u1', tenantId: 't1'),
    );
    scope = MicrofrontendScope(services);
  });

  tearDown(() async {
    await scope.dispose();
  });

  test('get creates an instance once and returns it afterwards', () {
    var creations = 0;
    final first = scope.get<_Client>((_) {
      creations++;
      return _Client('a');
    });
    final second = scope.get<_Client>((_) {
      creations++;
      return _Client('b');
    });
    expect(second, same(first));
    expect(creations, 1);
  });

  test('create receives the scope services', () {
    final client = scope.get<_Client>((s) => _Client(s.session.userId!));
    expect(client.name, 'u1');
    expect(scope.services, same(services));
  });

  test('dispose runs the disposers once, in reverse creation order', () async {
    final log = <String>[];
    scope.get<_Client>(
      (_) => _Client('first'),
      dispose: (c) => log.add(c.name),
    );
    scope.get<String>((_) => 'second', dispose: null);
    scope.get<int>((_) => 7);
    await scope.dispose();
    await scope.dispose();
    expect(log, ['first']);
  });

  test('get after dispose throws', () async {
    await scope.dispose();
    expect(() => scope.get<_Client>((_) => _Client('x')), throwsStateError);
  });

  test('signOut runs onSignOut', () async {
    var signedOut = 0;
    final shell = ShellServices(
      mode: ShellMode.demo,
      session: UserSession.anonymous(),
      onSignOut: () async => signedOut++,
    );
    await shell.signOut();
    expect(signedOut, 1);
  });

  test('demo services have no ApiClient: asking for one is a bug', () {
    final shell = ShellServices(
      mode: ShellMode.demo,
      session: UserSession.anonymous(),
    );
    expect(() => shell.api, throwsStateError);
  });

  test('live services cannot be built without an ApiClient', () {
    expect(
      () =>
          ShellServices(mode: ShellMode.live, session: UserSession.anonymous()),
      throwsArgumentError,
    );
  });

  test('emit publishes on the bus until the scope is disposed', () async {
    final bus = ShellEventBus();
    addTearDown(bus.dispose);
    final scoped = MicrofrontendScope(services, eventBus: bus);
    final received = <int>[];
    final subscription = bus.on<CountChanged>().listen(
      (event) => received.add(event.count),
    );
    addTearDown(subscription.cancel);

    scoped.emit(const CountChanged(1));
    await pumpEventQueue();
    final disposing = scoped.dispose();
    scoped.emit(const CountChanged(2));
    await disposing;
    await pumpEventQueue();

    expect(received, [1]);
  });

  test('emit without a bus drops the event', () {
    expect(() => scope.emit(const CountChanged(1)), returnsNormally);
  });

  test('requestStepUp runs onStepUp and is false without it', () async {
    var asked = 0;
    final shell = ShellServices(
      mode: ShellMode.demo,
      session: UserSession.anonymous(),
      onStepUp: () async {
        asked++;
        return true;
      },
    );
    expect(await shell.requestStepUp(), isTrue);
    expect(asked, 1);
    expect(
      await ShellServices(
        mode: ShellMode.demo,
        session: UserSession.anonymous(),
      ).requestStepUp(),
      isFalse,
    );
  });
}
