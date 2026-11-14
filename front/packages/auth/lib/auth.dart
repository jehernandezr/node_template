/// Sesión del front: [SessionManager], el repositorio de identity sobre
/// `ApiClient`, la conexión que reúne ambos con el acceso de la sesión, los
/// flujos de login y paso adicional y los puertos.
///
/// Los tipos y códigos son los generados del contrato `identity`
/// (`package:contracts`). Los adaptadores de almacenamiento seguro y de claves
/// de hardware (Keychain, Keystore, Secure Enclave o WebCrypto) viven fuera de
/// este paquete. Los dobles de prueba están en el paquete `test_utils`.
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
