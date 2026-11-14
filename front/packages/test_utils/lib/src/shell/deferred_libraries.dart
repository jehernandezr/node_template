import 'package:shell_core/shell_core.dart';

/// Loads every deferred library that a set of manifests reaches: their screens and what
/// their lifecycles load when they start.
///
/// Call it from `setUpAll`, outside the fake clock of `testWidgets`. The VM
/// keeps one load per deferred loading unit for the whole isolate, tied to
/// the zone of the test that asked first; a later test that opens another
/// library of the unit would wait on a clock that no longer runs, and its
/// page would spin forever.
final class DeferredLibrariesLoader {
  /// Creates the loader.
  const DeferredLibrariesLoader();

  /// Loads the screens and lifecycles of [manifests].
  Future<void> load(Iterable<MicrofrontendManifest> manifests) async {
    final bus = ShellEventBus();
    for (final manifest in manifests) {
      await _loadScreens(manifest.screens);
      final lifecycle = manifest.createLifecycle();
      if (lifecycle == null) continue;
      final scope = MicrofrontendScope(
        ShellServices(session: UserSession.anonymous(), mode: ShellMode.demo),
        eventBus: bus,
      );
      final context = ShellContext(
        eventBus: bus,
        session: UserSession.anonymous,
        scope: scope,
      );
      await lifecycle.initialize(context);
      await lifecycle.dispose();
      await context.dispose();
      await scope.dispose();
    }
    await bus.dispose();
  }

  Future<void> _loadScreens(List<ScreenRoute> screens) async {
    for (final screen in screens) {
      await screen.loadLibrary();
      await _loadScreens(screen.routes);
    }
  }
}
