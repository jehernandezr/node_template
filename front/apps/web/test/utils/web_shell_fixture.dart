import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shell_host/shell_host.dart';
import 'package:test_utils/test_utils.dart';
import 'package:web_shell/src/web_shell.dart';

/// Mounts the web shell for the shared scenarios and for the web-only tests.
final class WebShellFixture implements ShellFixture {
  const WebShellFixture();

  @override
  Future<ShellUnderTest> pump(
    WidgetTester tester,
    ShellScenarioSetup setup,
  ) async => (await _mount(tester, setup)).under;

  /// Mounts the shell, runs [body] with its host and closes it inside the
  /// test body.
  Future<void> run(
    WidgetTester tester,
    ShellScenarioSetup setup,
    Future<void> Function(ShellHost host) body,
  ) async {
    final mounted = await _mount(tester, setup);
    try {
      await body(mounted.host);
    } finally {
      await mounted.under.close();
    }
  }

  Future<({ShellHost host, ShellUnderTest under})> _mount(
    WidgetTester tester,
    ShellScenarioSetup setup,
  ) async {
    tester.platformDispatcher.localesTestValue = const [Locale('es')];
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);

    final host = buildWebHost(
      connection: setup.connection,
      manifests: [...webManifests, ...setup.manifests],
      clock: setup.clock.now,
    );
    final session = setup.session;
    if (session != null) host.session.value = session;
    await tester.pumpWidget(ShellHostApp(host: host));
    host.router.go(setup.initialLocation);
    await tester.pumpAndSettle();

    final under = ShellUnderTest(
      session: host.session,
      currentLocation: () => host.router.state.uri.toString(),
      router: host.router,
      close: () => _close(tester, host),
    );
    return (host: host, under: under);
  }

  /// Waits for the queued identity syncs, then unmounts the app, which
  /// disposes the host.
  Future<void> _close(WidgetTester tester, ShellHost host) async {
    final idle = await const RuntimeSettler().settle(
      tester,
      host.runtime.whenIdle,
    );
    expect(idle, isTrue, reason: 'the runtime never got idle');
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  }
}
