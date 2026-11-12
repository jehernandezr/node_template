import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

final class _Client {
  _Client(this.name);

  final String name;
}

void main() {
  late ShellServices services;
  late MicrofrontendScope scope;

  setUp(() {
    services = DefaultShellServices(
      session: UserSession(userId: 'u1', tenantId: 't1'),
      eventBus: ShellEventBus(),
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

  test(
    'DefaultShellServices looks up extras by exact type and runs signOut',
    () async {
      var signedOut = 0;
      final shell = DefaultShellServices(
        session: UserSession.anonymous(),
        eventBus: ShellEventBus(),
        onSignOut: () async => signedOut++,
        extras: {_Client: _Client('extra')},
      );
      expect(shell.extra<_Client>()!.name, 'extra');
      expect(shell.extra<String>(), isNull);
      await shell.signOut();
      expect(signedOut, 1);
    },
  );
}
