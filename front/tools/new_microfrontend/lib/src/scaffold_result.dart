/// What [MicrofrontendScaffolder.create] did and what is left to the person.
final class ScaffoldResult {
  /// Creates the result.
  const ScaffoldResult({
    required this.files,
    required this.appImport,
    required this.appRegistration,
    required this.appDependency,
  });

  /// Paths of the created files, relative to the front root, sorted.
  final List<String> files;

  /// Line for the shell files (`web_shell.dart`, `mobile_shell.dart`):
  /// the import of the manifest.
  final String appImport;

  /// Line for the manifest list of the shell files.
  final String appRegistration;

  /// Two-line entry for `dependencies:` in `apps/web/pubspec.yaml` and
  /// `apps/mobile/pubspec.yaml`.
  final String appDependency;
}
