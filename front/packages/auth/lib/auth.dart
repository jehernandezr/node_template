/// Front-end session: [SessionManager], the identity repository over
/// `ApiClient`, the connection that joins both with the session access, the
/// sign-in and step-up flows, and the ports.
///
/// Types and codes are the ones generated from the `identity` contract
/// (`package:contracts`). Secure storage and hardware key adapters (Keychain,
/// Keystore, Secure Enclave or WebCrypto) live outside this package. Test
/// doubles live in the `test_utils` package.
library;

export 'src/adapters/in_memory_token_store.dart';
export 'src/api_auth_repository.dart';
export 'src/auth_errors.dart';
export 'src/flows/mfa_flows.dart';
export 'src/flows/mfa_methods.dart';
export 'src/flows/mfa_state.dart';
export 'src/identity_connection.dart';
export 'src/ports.dart';
export 'src/session_manager.dart';
export 'src/session_transport.dart';
