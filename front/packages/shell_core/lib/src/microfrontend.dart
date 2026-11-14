import 'package:contracts/contracts.dart';

import 'access_rule.dart';
import 'enums.dart';
import 'shell_context.dart';
import 'user_session.dart';

/// Menu item a microfrontend contributes to the shell navigation.
final class MenuEntry {
  /// Creates a menu entry. [labelKey] is an i18n key, not a literal text.
  const MenuEntry({
    required this.labelKey,
    required this.path,
    required this.order,
  });

  /// Key of the label in the i18n bundle.
  final String labelKey;

  /// Absolute route path the entry navigates to.
  final String path;

  /// Sort position; lower values come first.
  final int order;
}

/// Metadata the registry needs to decide visibility.
abstract interface class MicrofrontendDescriptor {
  /// Unique id of the microfrontend.
  MicrofrontendId get id;

  /// Platforms where the microfrontend is included.
  Set<AppPlatform> get platforms;

  /// Rule that decides who can use the microfrontend.
  AccessRule get access;

  /// Feature flag that must be enabled to see the microfrontend, if any.
  FeatureFlag? get flag;
}

/// Optional lifecycle hooks of a microfrontend.
///
/// [ShellRuntime] calls [initialize] when the microfrontend becomes visible to
/// the current user, and [dispose] before it stops being visible or the user
/// or tenant changes.
///
/// Declare it in the manifest with `lifecycleFactory`: the runtime then builds
/// a new instance for every activation, so no state is shared between
/// identities or between runtimes. Publish events with [ShellContext.emit], so
/// an event sent after the identity changed is dropped.
abstract class Microfrontend {
  /// Creates a lifecycle object. Subclasses may be const.
  const Microfrontend();

  /// Starts the microfrontend for the current session. Default: no-op.
  ///
  /// If it throws, the runtime disposes it and retries on a later sync, after
  /// a backoff (see `ShellRuntime.lifecycleRetryDelay`).
  Future<void> initialize(ShellContext context) async {}

  /// Releases resources. Default: no-op.
  Future<void> dispose() async {}
}

/// Visibility rules shared by the registry and the router.
extension MicrofrontendVisibility on MicrofrontendDescriptor {
  /// Whether [session] may see this microfrontend on [platform] at [now]
  /// (default: the current time).
  ///
  /// Requires the platform to be supported, [access] to allow the session and,
  /// when [flag] is set, the session to hold that flag.
  bool isVisibleTo(
    UserSession session,
    AppPlatform platform, {
    DateTime? now,
  }) => _isAvailable(session, platform) && access.allows(session, now: now);

  /// Like [isVisibleTo], but an MFA rule counts as passed for a signed-in
  /// session. Menus use it so the user can open a section and step up there.
  bool isReachableBy(
    UserSession session,
    AppPlatform platform, {
    DateTime? now,
  }) =>
      _isAvailable(session, platform) && access.reachableBy(session, now: now);

  bool _isAvailable(UserSession session, AppPlatform platform) {
    if (!platforms.contains(platform)) return false;
    final requiredFlag = flag;
    return requiredFlag == null || session.featureFlags.contains(requiredFlag);
  }
}
