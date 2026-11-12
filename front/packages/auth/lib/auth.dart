/// Puertos, modelos y gestor de sesión de autenticación.
///
/// Los adaptadores reales (HTTP, almacenamiento seguro, Secure Enclave,
/// Android Keystore o WebCrypto) viven fuera de este paquete.
library;

export 'src/fakes.dart';
export 'src/models.dart';
export 'src/ports.dart';
export 'src/session_manager.dart';
