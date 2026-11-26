import 'package:flutter/foundation.dart';

/// Id of a microfrontend, declared by its own manifest. It is also the first
/// URL segment of its routes.
///
/// The shell packages know no microfrontend: the registry checks that ids
/// are unique when the shell registers the manifests.
@immutable
final class MicrofrontendId {
  /// Creates an id. [name] is lower case letters, digits and dashes, because
  /// it is a URL segment.
  const MicrofrontendId(this.name);

  /// Stable name, for example `tasks`.
  final String name;

  /// First path segment of the routes that belong to this microfrontend.
  String get pathSegment => name;

  static final RegExp _pattern = RegExp(r'^[a-z][a-z0-9-]*$');

  /// Whether [name] can be used as a URL segment.
  bool get isValid => _pattern.hasMatch(name);

  @override
  bool operator ==(Object other) =>
      other is MicrofrontendId && other.name == name;

  @override
  int get hashCode => name.hashCode;

  @override
  String toString() => 'MicrofrontendId($name)';
}

/// Platform the shell runs on.
enum AppPlatform {
  /// The browser shell.
  web,

  /// The Android and iOS shell.
  mobile,
}

/// Where a shell gets its data from. Chosen once, when the shell starts.
enum ShellMode {
  /// Demo sessions and in-memory repositories. No server is involved.
  demo,

  /// A real API: the session comes from identity and repositories call the
  /// API. A microfrontend without a real adapter is not offered.
  live,
}
