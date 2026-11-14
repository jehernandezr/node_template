import 'package:flutter/widgets.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

/// Counts what the preloader touches in a manifest: screen loads and the
/// lifecycle calls.
final class ProbeManifest {
  int screenLoads = 0;
  int initializeCalls = 0;
  int disposeCalls = 0;

  /// The manifest under test, with a screen, a child route and a lifecycle.
  MicrofrontendManifest build() => MicrofrontendManifest(
    id: const MicrofrontendId('probe'),
    platforms: const {AppPlatform.web},
    access: AccessRule.authenticated(),
    menu: const [],
    screens: [
      ScreenRoute(
        path: '/probe',
        loadLibrary: _load,
        builder: (scope, {params = const {}}) => const SizedBox(),
        routes: [
          ScreenRoute(
            path: 'child',
            loadLibrary: _load,
            builder: (scope, {params = const {}}) => const SizedBox(),
          ),
        ],
      ),
    ],
    lifecycleFactory: () => _ProbeLifecycle(this),
  );

  Future<void> _load() async {
    screenLoads++;
  }
}

final class _ProbeLifecycle extends Microfrontend {
  _ProbeLifecycle(this._probe);

  final ProbeManifest _probe;

  @override
  Future<void> initialize(ShellContext context) async {
    _probe.initializeCalls++;
  }

  @override
  Future<void> dispose() async {
    _probe.disposeCalls++;
  }
}
