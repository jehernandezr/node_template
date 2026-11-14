/// Maps incoming app links to router locations. Pure Dart.
///
/// Accepted forms:
/// - `nodetemplate://verifier?challenge=<id>` -> `/verifier?challenge=<id>`
/// - `nodetemplate://tasks/<id>` -> `/tasks/<id>`
/// - `https://<webHost>/tasks/<id>` -> `/tasks/<id>`
/// - `https://<webHost>/verifier?challenge=<id>` -> `/verifier?challenge=<id>`
///
/// Unknown schemes, hosts, paths, reserved ids (`new`, `edit`), and ids that
/// are not plain tokens return null.
/// The mapper is not wired to a deep-link plugin yet.
final class DeepLinkMapper {
  /// Creates a mapper that accepts web links from [webHost].
  const DeepLinkMapper({this.webHost = defaultWebHost});

  /// Host of the web app whose links are accepted.
  final String webHost;

  /// Custom scheme of the app.
  static const String customScheme = 'nodetemplate';

  /// Web host used by default.
  static const String defaultWebHost = 'app.example.test';

  static final RegExp _idPattern = RegExp(r'^[A-Za-z0-9_-]{1,128}$');

  /// Child segments of a collection route. They name a page, not an item, so
  /// they are never accepted as an id (`tasks/new` is the create form).
  static const Set<String> _reservedIds = {'new', 'edit'};

  /// Router location for [uri], or null when the link is not recognized.
  String? map(Uri uri) {
    if (uri.scheme == customScheme) {
      return _route(uri.host, uri.pathSegments, uri.queryParameters);
    }
    if (uri.scheme == 'https' && uri.host == webHost) {
      final segments = uri.pathSegments;
      if (segments.isEmpty) return null;
      return _route(
        segments.first,
        segments.skip(1).toList(),
        uri.queryParameters,
      );
    }
    return null;
  }

  String? _route(String section, List<String> rest, Map<String, String> query) {
    switch (section) {
      case 'verifier':
        if (rest.isNotEmpty) return null;
        final challenge = query['challenge'];
        if (challenge == null || !_idPattern.hasMatch(challenge)) return null;
        return Uri(
          path: '/verifier',
          queryParameters: {'challenge': challenge},
        ).toString();
      case 'tasks':
        if (rest.length != 1) return null;
        final id = rest.first;
        if (_reservedIds.contains(id) || !_idPattern.hasMatch(id)) return null;
        return '/tasks/$id';
      default:
        return null;
    }
  }
}
