import 'package:shell_core/shell_core.dart';

import 'deferred_libraries_preloader.dart';

/// Legacy: use [DeferredLibrariesPreloader]. It stays only until its callers
/// move over.
final class DeferredLibrariesLoader {
  /// Creates the loader.
  const DeferredLibrariesLoader();

  /// Loads the screens and lifecycles of [manifests].
  Future<void> load(Iterable<MicrofrontendManifest> manifests) =>
      const DeferredLibrariesPreloader().load(manifests);
}
