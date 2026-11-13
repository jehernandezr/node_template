import 'package:flutter/foundation.dart';
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
        labelKey: 'menu.${id.name}',
        path: '/${id.pathSegment}',
        order: order,
      ),
    ],
  );
}

/// Runtime over [registry] that follows [session]. Services default to a
/// [DefaultShellServices] on the runtime's own event bus.
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
        (identity) =>
            DefaultShellServices(session: identity, eventBus: runtime.eventBus),
  );
  return runtime;
}
