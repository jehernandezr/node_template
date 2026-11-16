import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'probe_count.dart';

/// Builds the one-screen manifests the host tests register.
abstract final class ProbeManifest {
  /// A web manifest with the path `/<id>`, one menu entry and one screen that
  /// draws `<id> <mode>`. [withBadge] adds a badge fed by `ProbeCount`.
  static MicrofrontendManifest build(
    String id, {
    Set<ShellMode> modes = const {ShellMode.demo, ShellMode.live},
    bool withBadge = false,
    AccessRule? access,
  }) => MicrofrontendManifest(
    id: MicrofrontendId(id),
    platforms: {AppPlatform.web},
    access: access ?? AccessRule.authenticated(),
    modes: modes,
    menu: [
      MenuEntry(
        label: MenuLabel({'es': id, 'en': id}),
        path: '/$id',
        order: 1,
        icon: Icons.circle_outlined,
        badge: withBadge
            ? const MenuBadge<ProbeCount>(ProbeCount.valueOf)
            : null,
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
}
