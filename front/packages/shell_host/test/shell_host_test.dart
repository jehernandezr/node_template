import 'dart:async';

import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:test_utils/test_utils.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';

/// Replayable event of the probe microfrontend, shown as its menu badge.
final class _Count extends ReplayableShellEvent {
  const _Count(this.value);

  final int value;
}

int _countOf(_Count event) => event.value;

MicrofrontendManifest _manifest(
  String id, {
  Set<ShellMode> modes = const {ShellMode.demo, ShellMode.live},
  MenuBadge? badge,
}) => MicrofrontendManifest(
  id: MicrofrontendId(id),
  platforms: {AppPlatform.web},
  access: AccessRule.authenticated(),
  modes: modes,
  menu: [
    MenuEntry(
      label: MenuLabel({'es': id, 'en': id}),
      path: '/$id',
      order: 1,
      icon: Icons.circle_outlined,
      badge: badge,
    ),
  ],
  screens: [
    ScreenRoute(
      path: '/$id',
      loadLibrary: () async {},
      builder: (scope, {params = const {}}) =>
          Text('$id ${scope.services.mode.name}'),
    ),
  ],
);

ShellHost _host({
  List<MicrofrontendManifest>? manifests,
  IdentityConnection? connection,
}) => ShellHost(
  platform: AppPlatform.web,
  manifests: manifests ?? [_manifest('alpha')],
  connection: connection,
  scaffold: (context, host, location, child) => child,
);

/// Transport whose answer each test decides.
final class _Transport implements HttpTransport {
  _Transport(this.answer);

  Future<TransportResponse> Function(TransportRequest request) answer;
  bool closed = false;

  @override
  Future<TransportResponse> send(TransportRequest request) => answer(request);

  @override
  void close() => closed = true;
}

IdentityConnection _connection(_Transport transport) => IdentityConnection(
  transport: transport,
  baseUri: Uri.parse('https://api.example.com'),
  // A stored session token makes `restore` try a refresh.
  tokenStore: FakeTokenStore('session-1'),
);

void main() {
  group('safeReturnLocation', () {
    test('keeps in-app paths and rejects external targets', () {
      expect(safeReturnLocation(null), '/');
      expect(safeReturnLocation('/tasks/t1?x=1'), '/tasks/t1?x=1');
      expect(safeReturnLocation('tasks'), '/');
      expect(safeReturnLocation('https://evil.test/x'), '/');
      expect(safeReturnLocation('//evil.test/x'), '/');
      expect(safeReturnLocation(r'/\evil.test'), '/');
    });
  });

  test('every demo profile signs in with a different user', () {
    final users = {
      for (final profile in DemoProfile.values) profile.session().userId,
    };
    expect(users, hasLength(DemoProfile.values.length));
    expect(users, isNot(contains(null)));
  });

  group('mode', () {
    test('without a connection the shell is demo and keeps demo-only '
        'microfrontends', () async {
      final host = _host(
        manifests: [
          _manifest('alpha'),
          _manifest('beta', modes: {ShellMode.demo}),
        ],
      );
      addTearDown(host.dispose);

      expect(host.mode, ShellMode.demo);
      expect(host.registry.manifests.map((m) => m.id.name), ['alpha', 'beta']);
    });

    test('with a connection the shell is live and leaves out what only '
        'serves demo data', () async {
      final host = _host(
        manifests: [
          _manifest('alpha'),
          _manifest('beta', modes: {ShellMode.demo}),
        ],
        connection: _connection(
          _Transport((_) async => const TransportResponse(statusCode: 503)),
        ),
      );
      addTearDown(host.dispose);

      expect(host.mode, ShellMode.live);
      expect(host.registry.manifests.map((m) => m.id.name), ['alpha']);
      host.session.value = UserSession(userId: 'u1', tenantId: 't1');
      final services = host.runtime
          .scopeFor(const MicrofrontendId('alpha'))
          .services;
      expect(services.mode, ShellMode.live);
      expect(services.api, isA<ApiClient>());
    });
  });

  group('start', () {
    test('without network the user stays signed out and nothing is '
        'reported', () async {
      final transport = _Transport(
        (request) async => throw TransportException(
          TransportFailure.connection,
          uri: request.uri,
        ),
      );
      final host = _host(connection: _connection(transport));
      addTearDown(host.dispose);
      final reported = <FlutterErrorDetails>[];
      final previous = FlutterError.onError;
      FlutterError.onError = reported.add;
      addTearDown(() => FlutterError.onError = previous);

      await host.start();

      expect(host.session.value.isAuthenticated, isFalse);
      expect(reported, isEmpty);
    });

    test('a failure that is not the network is reported', () async {
      final transport = _Transport(
        (_) async => const TransportResponse(statusCode: 500, body: '{}'),
      );
      final host = _host(connection: _connection(transport));
      addTearDown(host.dispose);
      final reported = <FlutterErrorDetails>[];
      final previous = FlutterError.onError;
      FlutterError.onError = reported.add;
      addTearDown(() => FlutterError.onError = previous);

      await host.start();

      expect(host.session.value.isAuthenticated, isFalse);
      expect(reported.single.exception, isA<ApiErrorException>());
    });

    test(
      'dispose closes the connection transport, then completes whenDisposed',
      () async {
        final transport = _Transport(
          (_) async => const TransportResponse(statusCode: 503),
        );
        final host = _host(connection: _connection(transport));

        var disposed = false;
        unawaited(host.whenDisposed.then((_) => disposed = true));
        final disposing = host.dispose();
        final beforeDisposal = disposed;
        await disposing;
        await pumpEventQueue();

        expect(transport.closed, isTrue);
        expect(beforeDisposal, isFalse);
        expect(disposed, isTrue);
      },
    );
  });

  test('a menu badge follows its event and resets with the identity', () async {
    final host = _host(
      manifests: [_manifest('alpha', badge: const MenuBadge<_Count>(_countOf))],
    );
    addTearDown(host.dispose);
    host.session.value = UserSession(userId: 'u1', tenantId: 't1');
    final entry = host.registry.manifests.single.menu.single;
    expect(host.badgeFor(entry), 0);

    host.runtime.eventBus.emit(const _Count(4));
    await pumpEventQueue();
    expect(host.badgeFor(entry), 4);

    host.session.value = UserSession(userId: 'u2', tenantId: 't1');
    expect(host.badgeFor(entry), 0);
  });
}
