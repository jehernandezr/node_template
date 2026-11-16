import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:shell_host/shell_host.dart' show IdentityConnectionFactory;

/// Base URL of the API, from `--dart-define=API_BASE_URL=https://...`.
///
/// Empty means demo mode: demo sessions and the microfrontends' in-memory
/// data.
const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

/// Real identity connection when [baseUrl] is set, or null in demo mode.
///
/// The session token lives in memory ([InMemoryTokenStore]) until the
/// Keychain and Keystore adapter exists, so a restart asks for the sign-in
/// again. There is no device key either: without a Secure Enclave or Keystore
/// adapter the sign-in does not register the device, and no fake key ever
/// reaches a real server.
IdentityConnection? mobileIdentityConnection([String baseUrl = apiBaseUrl]) =>
    IdentityConnectionFactory(
      baseUrl: baseUrl,
      transport: () => PackageHttpTransport(),
      tokenStore: () => InMemoryTokenStore(),
    ).create();
