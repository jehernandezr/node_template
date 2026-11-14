import 'package:shell_core/shell_core.dart';

/// Maps incoming app links to router locations.
///
/// The mapper only knows the shell's part of a link: the custom scheme
/// (`nodetemplate://<section>/...`) and the web host
/// (`https://<webHost>/<section>/...`). The section is a microfrontend id, and
/// that microfrontend's manifest decides which of its locations the rest of
/// the link opens (`MicrofrontendManifest.deepLinks`). Anything else returns
/// null.
///
/// It is not wired to a deep-link plugin yet: the mapping exists so each
/// microfrontend declares its links with its manifest.
final class DeepLinkMapper {
  /// Creates a mapper over the manifests of [registry] that accepts web links
  /// from [webHost].
  const DeepLinkMapper(this.registry, {this.webHost = defaultWebHost});

  /// Manifests that resolve their own links.
  final MicrofrontendRegistry registry;

  /// Host of the web app whose links are accepted.
  final String webHost;

  /// Custom scheme of the app.
  static const String customScheme = 'nodetemplate';

  /// Web host used by default.
  static const String defaultWebHost = 'app.example.test';

  /// Router location for [uri], or null when the link is not recognized.
  String? map(Uri uri) {
    final List<String> segments;
    if (uri.scheme == customScheme) {
      segments = [uri.host, ...uri.pathSegments];
    } else if (uri.scheme == 'https' && uri.host == webHost) {
      segments = uri.pathSegments;
    } else {
      return null;
    }
    return registry.resolveDeepLink(
      segments,
      uri.queryParameters,
      AppPlatform.mobile,
    );
  }
}
