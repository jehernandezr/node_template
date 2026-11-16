import 'package:go_router/go_router.dart';
import 'package:shell_core/shell_core.dart';

/// What [BackofficeHarness.pump] mounted: the router and the scope of the
/// identity.
final class MountedBackoffice {
  const MountedBackoffice({required this.router, required this.scope});

  final GoRouter router;
  final MicrofrontendScope scope;

  /// Current location of the router.
  Uri get location => router.routerDelegate.currentConfiguration.uri;
}
