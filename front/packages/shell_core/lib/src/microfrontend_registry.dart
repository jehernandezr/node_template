import 'package:i18n/i18n.dart';

import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_manifest.dart';
import 'user_session.dart';

/// Holds the manifests of a shell and answers what a session can use.
final class MicrofrontendRegistry {
  final Map<MicrofrontendId, MicrofrontendManifest> _manifests = {};

  /// Registers [manifest].
  ///
  /// Throws [StateError] if its id is already registered or is not a valid
  /// URL segment, or if a menu label lacks one of the [supportedLocales].
  void register(MicrofrontendManifest manifest) {
    final id = manifest.id;
    if (!id.isValid) {
      throw StateError('Microfrontend id is not a URL segment: "${id.name}"');
    }
    if (_manifests.containsKey(id)) {
      throw StateError('Microfrontend already registered: ${id.name}');
    }
    for (final entry in manifest.menu) {
      for (final locale in supportedLocales) {
        if (!entry.label.byLanguage.containsKey(locale.languageCode)) {
          throw StateError(
            'Menu entry ${entry.path} of ${id.name} has no '
            '"${locale.languageCode}" label',
          );
        }
      }
    }
    _manifests[id] = manifest;
  }

  /// All registered manifests, in registration order.
  Iterable<MicrofrontendManifest> get manifests => _manifests.values;

  /// Manifest registered for [id], or null.
  MicrofrontendManifest? manifestFor(MicrofrontendId id) => _manifests[id];

  /// Manifest whose segment is the first one of [location], or null when no
  /// registered microfrontend owns it.
  MicrofrontendManifest? manifestForPath(String location) {
    final segment = Uri.parse(location).pathSegments.firstOrNull;
    return segment == null ? null : _manifests[MicrofrontendId(segment)];
  }

  /// Manifests visible to [session] on [platform] at [now], in registration
  /// order.
  List<MicrofrontendManifest> visibleFor(
    UserSession session,
    AppPlatform platform, {
    DateTime? now,
  }) => [
    for (final manifest in _manifests.values)
      if (manifest.isVisibleTo(session, platform, now: now)) manifest,
  ];

  /// Menu entries of the manifests [session] can reach on [platform], sorted
  /// by [MenuEntry.order].
  ///
  /// A manifest that only lacks a recent second factor is included, so the
  /// user can open it and step up. Entries with equal order keep registration
  /// order where the sort allows.
  List<MenuEntry> menuFor(
    UserSession session,
    AppPlatform platform, {
    DateTime? now,
  }) {
    final entries = [
      for (final manifest in _manifests.values)
        if (manifest.isReachableBy(session, platform, now: now))
          ...manifest.menu,
    ];
    entries.sort((a, b) => a.order.compareTo(b.order));
    return entries;
  }

  /// Router location for an app link whose path is [segments] and whose
  /// query is [query], or null when no microfrontend registered for
  /// [platform] accepts it.
  ///
  /// The first segment picks the microfrontend; its `deepLinks` reads the
  /// rest. A location outside that microfrontend's routes is refused.
  String? resolveDeepLink(
    List<String> segments,
    Map<String, String> query,
    AppPlatform platform,
  ) {
    if (segments.isEmpty) return null;
    final manifest = _manifests[MicrofrontendId(segments.first)];
    final resolve = manifest?.deepLinks;
    if (manifest == null ||
        resolve == null ||
        !manifest.platforms.contains(platform)) {
      return null;
    }
    final location = resolve(segments.sublist(1), query);
    if (location == null) return null;
    final prefix = '/${manifest.id.pathSegment}';
    final path = Uri.parse(location).path;
    return path == prefix || path.startsWith('$prefix/') ? location : null;
  }
}
