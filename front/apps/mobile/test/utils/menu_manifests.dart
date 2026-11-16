import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

/// Manifests that each add one menu entry, for the scaffold tests. Entry `i`
/// goes to `/m$i` and is labelled "Entrada $i" in Spanish.
final class MenuManifests {
  /// Creates the builder for [count] entries.
  const MenuManifests({required this.count});

  /// Number of entries and manifests.
  final int count;

  /// One manifest per entry, in order.
  List<MicrofrontendManifest> build() => [
    for (var i = 0; i < count; i++)
      MicrofrontendManifest(
        id: MicrofrontendId('m$i'),
        platforms: {AppPlatform.mobile},
        access: AccessRule.public(),
        menu: [
          MenuEntry(
            label: MenuLabel({'es': 'Entrada $i', 'en': 'Entry $i'}),
            path: '/m$i',
            order: i,
            icon: Icons.circle_outlined,
          ),
        ],
        screens: [
          ScreenRoute(
            path: '/m$i',
            loadLibrary: _noLibrary,
            builder: (scope, {params = const {}}) => const SizedBox.shrink(),
          ),
        ],
      ),
  ];

  static Future<void> _noLibrary() async {}
}
