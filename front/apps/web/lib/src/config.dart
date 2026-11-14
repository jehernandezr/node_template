import 'package:api/api.dart';
import 'package:auth/auth.dart';

/// Base URL of the API, from `--dart-define=API_BASE_URL=https://...`.
///
/// Empty means demo mode: demo sessions and the microfrontends' fakes.
const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

/// Real identity connection when [baseUrl] is set, or null in demo mode.
///
/// On the web the session token is an httpOnly cookie: the token store is
/// [CookieTokenStore] and the browser client sends credentials to the API
/// origin. There is no [DeviceKeyPort] on the web yet, so the sign-in does
/// not register the browser as a device.
IdentityConnection? webIdentityConnection([String baseUrl = apiBaseUrl]) {
  if (baseUrl.isEmpty) return null;
  return IdentityConnection(
    transport: PackageHttpTransport(withCredentials: true),
    baseUri: Uri.parse(baseUrl),
    tokenStore: const CookieTokenStore(),
  );
}
