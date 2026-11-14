/// Returns [from] when it is an in-app absolute path, otherwise `/`.
///
/// `from` comes from the URL, so anyone can write it: an external or
/// protocol-relative target (`//host`, `https://...`, `/\host`) would turn the
/// sign-in into an open redirect.
String safeReturnLocation(String? from) {
  if (from == null || !from.startsWith('/') || from.startsWith('//')) {
    return '/';
  }
  if (from.contains(r'\')) return '/';
  return from;
}
