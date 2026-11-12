import 'package:go_router/go_router.dart';

import 'deferred_page.dart';
import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_manifest.dart';
import 'microfrontend_scope.dart';
import 'user_session.dart';

/// Holds the manifests of a shell and answers what a session can use.
final class MicrofrontendRegistry {
  final Map<MicrofrontendId, MicrofrontendManifest> _manifests = {};

  /// Registers [manifest]. Throws [StateError] if its id is already registered.
  void register(MicrofrontendManifest manifest) {
    if (_manifests.containsKey(manifest.id)) {
      throw StateError('Microfrontend already registered: ${manifest.id.name}');
    }
    _manifests[manifest.id] = manifest;
  }

  /// All registered manifests, in registration order.
  Iterable<MicrofrontendManifest> get manifests => _manifests.values;

  /// Manifest registered for [id], or null.
  MicrofrontendManifest? manifestFor(MicrofrontendId id) => _manifests[id];

  /// Manifests visible to [session] on [platform], in registration order.
  List<MicrofrontendManifest> visibleFor(
    UserSession session,
    AppPlatform platform,
  ) => [
    for (final manifest in _manifests.values)
      if (manifest.isVisibleTo(session, platform)) manifest,
  ];

  /// Menu entries of the visible manifests, sorted by [MenuEntry.order].
  ///
  /// Entries with equal order keep registration order where the sort allows.
  List<MenuEntry> menuFor(UserSession session, AppPlatform platform) {
    final entries = [
      for (final manifest in visibleFor(session, platform)) ...manifest.menu,
    ];
    entries.sort((a, b) => a.order.compareTo(b.order));
    return entries;
  }

  /// Routes of every manifest registered for [platform], built with [load].
  ///
  /// [scopeFor] supplies the scope of each manifest. Routes are not filtered by
  /// visibility: the router guards them by path. Prefer `buildShellRouter`,
  /// which builds each manifest's routes only once.
  List<RouteBase> routesFor(
    AppPlatform platform,
    ScreenLoader load,
    MicrofrontendScope Function(MicrofrontendId id) scopeFor,
  ) => [
    for (final manifest in _manifests.values)
      if (manifest.platforms.contains(platform))
        ...manifest.routes(load, () => scopeFor(manifest.id)),
  ];
}
