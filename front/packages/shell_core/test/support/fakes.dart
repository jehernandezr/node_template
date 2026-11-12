import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:shell_core/shell_core.dart';

/// Builds a manifest for tests. When [routePath] is set, it exposes one GoRoute.
MicrofrontendManifest fakeManifest({
  required MicrofrontendId id,
  Set<AppPlatform> platforms = const {AppPlatform.web, AppPlatform.mobile},
  AccessRule? access,
  FeatureFlag? flag,
  int order = 0,
  String? routePath,
  List<RouteBase> Function(
    ScreenLoader load,
    MicrofrontendScope Function() scope,
  )?
  routes,
  Microfrontend? lifecycle,
}) {
  final path = routePath;
  return MicrofrontendManifest(
    id: id,
    platforms: platforms,
    access: access ?? AccessRule.public(),
    flag: flag,
    lifecycle: lifecycle,
    menu: [
      MenuEntry(
        labelKey: 'menu.${id.name}',
        path: '/${id.pathSegment}',
        order: order,
      ),
    ],
    routes:
        routes ??
        (_, _) => [
          if (path != null)
            GoRoute(path: path, builder: (context, state) => Text(path)),
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
