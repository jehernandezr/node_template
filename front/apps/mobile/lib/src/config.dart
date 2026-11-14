import 'package:api/api.dart';
import 'package:auth/auth.dart';

/// Base URL of the API, from `--dart-define=API_BASE_URL=https://...`.
///
/// Empty means demo mode: demo sessions and the microfrontends' fakes.
const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

/// Real identity connection when [baseUrl] is set, or null in demo mode.
///
/// Pending for the identity phase: the session token lives in memory
/// ([InMemoryTokenStore]) until the Keychain/Keystore adapter exists, so a
/// restart asks for the sign-in again; and there is no [DeviceKeyPort] of the
/// Secure Enclave or Keystore yet, so the sign-in does not register the device
/// (the demo key is never sent to a real server).
IdentityConnection? mobileIdentityConnection([String baseUrl = apiBaseUrl]) {
  if (baseUrl.isEmpty) return null;
  return IdentityConnection(
    transport: PackageHttpTransport(),
    baseUri: Uri.parse(baseUrl),
    tokenStore: InMemoryTokenStore(),
  );
}
