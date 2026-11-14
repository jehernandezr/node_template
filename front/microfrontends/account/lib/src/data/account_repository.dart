import 'package:contracts/contracts.dart' show DeviceSummary, SessionSummary;
import 'package:shell_core/shell_core.dart';

import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';

/// Acceso a los datos de la cuenta.
///
/// Sesiones y dispositivos tienen contrato `identity` y todo repositorio los
/// sirve. El resto (perfil, confianza de dispositivos, seguridad, acuerdos)
/// depende de [capabilities]: un repositorio que no tiene una capacidad lanza
/// [UnsupportedError] en sus operaciones, y las pantallas no las ofrecen.
abstract interface class AccountRepository implements ScopedResource {
  /// Capacidades que este repositorio sirve de verdad.
  Set<AccountCapability> get capabilities;

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
