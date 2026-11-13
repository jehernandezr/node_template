/// Sesión del front: [SessionManager], el repositorio de identity sobre
/// `ApiClient`, la conexión que reúne ambos con el acceso de la sesión, los
/// puertos y los fakes.
///
/// Los tipos y códigos son los generados del contrato `identity`
/// (`package:contracts`). Los adaptadores de almacenamiento seguro y de claves
/// de hardware (Keychain, Keystore, Secure Enclave o WebCrypto) viven fuera de
/// este paquete.
library;

export 'src/api_auth_repository.dart';
export 'src/auth_errors.dart';
export 'src/fakes.dart';
export 'src/identity_connection.dart';
export 'src/ports.dart';
export 'src/session_manager.dart';
