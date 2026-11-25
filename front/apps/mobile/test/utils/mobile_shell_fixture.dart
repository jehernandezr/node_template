import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_shell/src/mobile_shell.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';
import 'package:test_utils/test_utils.dart';

/// Mounts the mobile shell for the shared scenarios: a phone in Spanish,
/// the real mobile manifests and whatever the setup adds.
final class MobileShellFixture implements ShellFixture {
  /// Creates the fixture. [appManifests] default to [mobileManifests].
  MobileShellFixture({List<MicrofrontendManifest>? appManifests})
    : appManifests = appManifests ?? mobileManifests;

  /// Manifests registered before those of each setup.
  final List<MicrofrontendManifest> appManifests;

  /// Sets a 390 by 844 phone at 3x in Spanish until the test ends.
  void usePhoneInSpanish(WidgetTester tester) {
    tester.view.physicalSize = const Size(390, 844) * 3;
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    tester.platformDispatcher.localeTestValue = const Locale('es');
    tester.platformDispatcher.localesTestValue = const [Locale('es')];
    addTearDown(tester.platformDispatcher.clearLocaleTestValue);
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);
  }

  @override
  Future<ShellUnderTest> pump(
    WidgetTester tester,
    ShellScenarioSetup setup,
  ) async => (await _mount(tester, setup)).under;

  /// Mounts the app, runs [body] with its host and closes it, also when the
  /// body fails.
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
    usePhoneInSpanish(tester);
    final host = buildMobileHost(
      connection: setup.connection,
      manifests: [...appManifests, ...setup.manifests],
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

  /// Waits until the runtime of [host] has no queued work. A host whose
  /// session changed queues its sync, which only runs while the test pumps
  /// and lets the real event loop turn, so it has to settle before it is
  /// disposed.
  Future<void> settleRuntime(WidgetTester tester, ShellHost host) async {
    final idle = await const RuntimeSettler().settle(
      tester,
      host.runtime.whenIdle,
    );
    expect(idle, isTrue, reason: 'the runtime never got idle');
  }

  /// Settles the runtime, unmounts the app and waits for [ShellHostApp] to
  /// finish disposing the host.
  Future<void> _close(WidgetTester tester, ShellHost host) async {
    await settleRuntime(tester, host);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    // The scopes of the identity hold live connections that close only when
    // the disposal of the host finishes.
    final disposed = await const RuntimeSettler().settle(
      tester,
      () => host.whenDisposed,
    );
    expect(disposed, isTrue, reason: 'the host never finished disposing');
  }
}
