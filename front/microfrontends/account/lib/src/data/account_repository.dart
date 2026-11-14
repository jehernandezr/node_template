import 'package:contracts/contracts.dart' show DeviceSummary, SessionSummary;
import 'package:shell_core/shell_core.dart';

import '../shared/types/account_types.dart';

/// Acceso a los datos de la cuenta. Sesiones y dispositivos tienen contrato
/// `identity` y los resuelve `ApiAccountRepository`; el resto (perfil,
/// seguridad, acuerdos) no tiene contrato aún y solo lo cubre
/// `FakeAccountRepository`.
abstract interface class AccountRepository implements ScopedResource {
  Future<AccountProfile> loadProfile();

  /// Sesiones activas, la actual incluida.
  Future<List<SessionSummary>> listSessions();

  /// Cierra una sesión remota.
  Future<void> revokeSession(String sessionId);

  /// Cierra todas las sesiones menos la actual. Devuelve cuántas cerró.
  Future<int> revokeOtherSessions();

  Future<List<DeviceSummary>> listDevices();

  /// Retira la confianza de un dispositivo.
  Future<void> removeDeviceTrust(String deviceId);

  Future<SecurityOverview> loadSecurity();

  /// Registra una passkey nueva.
  Future<void> addPasskey();

  /// Genera códigos de recuperación nuevos; invalida los anteriores.
  Future<List<String>> regenerateRecoveryCodes();

  Future<List<Agreement>> listPendingAgreements();

  Future<List<Agreement>> listAcceptedAgreements();

  Future<void> acceptAgreement(String agreementId);
}
