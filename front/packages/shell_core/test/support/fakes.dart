import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

/// A [ScreenRoute] that shows [text], loaded without delay.
ScreenRoute fakeScreen(
  String path,
  String text, {
  AccessRule? access,
  List<ScreenRoute> routes = const [],
}) => ScreenRoute(
  path: path,
  access: access,
  loadLibrary: () async {},
  builder: (scope, {params = const {}}) => Text(text),
  routes: routes,
);

/// Builds a manifest for tests. When [routePath] is set, it exposes one
/// screen at that path showing the same text.
MicrofrontendManifest fakeManifest({
  required MicrofrontendId id,
  Set<AppPlatform> platforms = const {AppPlatform.web, AppPlatform.mobile},
  AccessRule? access,
  FeatureFlag? flag,
  int order = 0,
  String? routePath,
  Microfrontend Function()? lifecycleFactory,
  List<ScreenRoute> screens = const [],
}) {
  final path = routePath;
  return MicrofrontendManifest(
    id: id,
    platforms: platforms,
    access: access ?? AccessRule.public(),
    flag: flag,
    lifecycleFactory: lifecycleFactory,
    screens: [if (path != null) fakeScreen(path, path), ...screens],
    menu: [
      MenuEntry(
        label: MenuLabel({'es': id.name, 'en': id.name}),
        path: '/${id.pathSegment}',
        order: order,
        icon: Icons.circle_outlined,
      ),
    ],
  );
}

/// Runtime over [registry] that follows [session]. Services default to demo
/// [ShellServices].
ShellRuntime fakeRuntime({
  required MicrofrontendRegistry registry,
  required ValueListenable<UserSession> session,
  AppPlatform platform = AppPlatform.web,
  ShellServices Function(UserSession session)? servicesFactory,
}) {
  late final ShellRuntime runtime;
  runtime = ShellRuntime(
    registry: registry,
    platform: platform,
    session: session,
    servicesFactory:
        servicesFactory ??
        (identity) => ShellServices(session: identity, mode: ShellMode.demo),
  );
  return runtime;
}

/// Ids of the test microfrontends. The shell packages know none of their own.
abstract final class TestIds {
  static const account = MicrofrontendId('account');
  static const tasks = MicrofrontendId('tasks');
  static const notifications = MicrofrontendId('notifications');
  static const assistant = MicrofrontendId('assistant');
  static const billing = MicrofrontendId('billing');
  static const backoffice = MicrofrontendId('backoffice');
  static const verifier = MicrofrontendId('verifier');
}

/// Replayable event for tests of the bus and the menu badge.
final class CountChanged extends ReplayableShellEvent {
  const CountChanged(this.count);

  final int count;
}

/// `shellBuilder` that draws the microfrontend page alone.
Widget passThroughShell(
  BuildContext context,
  GoRouterState state,
  Widget child,
) => child;
