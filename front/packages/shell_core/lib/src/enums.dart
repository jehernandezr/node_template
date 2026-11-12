/// Microfrontends that compose the shells. The name is also the URL segment.
enum MicrofrontendId {
  account,
  tasks,
  notifications,
  assistant,
  billing,
  backoffice,
  verifier;

  /// First path segment of the routes that belong to this microfrontend.
  String get pathSegment => name;
}

/// Shell platforms a microfrontend can run on.
enum AppPlatform { web, mobile }
