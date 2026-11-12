import 'account_models.dart';

/// Acceso a los datos de la cuenta. La implementación real llamará a la API de
/// identity y agreements; por ahora solo existe [FakeAccountRepository].
abstract interface class AccountRepository {
  Future<AccountProfile> loadProfile();

  Future<List<AppSession>> listSessions();

  /// Cierra una sesión remota.
  Future<void> revokeSession(String sessionId);

  /// Cierra todas las sesiones menos la actual. Devuelve cuántas cerró.
  Future<int> revokeOtherSessions();

  Future<List<TrustedDevice>> listDevices();

  /// Retira la confianza de un dispositivo.
  Future<void> removeDeviceTrust(String deviceId);

  Future<SecurityOverview> loadSecurity();

  /// Registra una passkey nueva.
  Future<void> addPasskey();

  /// Genera códigos de recuperación nuevos; invalida los anteriores.
  Future<List<String>> regenerateRecoveryCodes();

  /// Valida el código del paso adicional de MFA.
  Future<bool> verifyStepUpCode(String code);

  Future<List<Agreement>> listPendingAgreements();

  Future<List<Agreement>> listAcceptedAgreements();

  Future<void> acceptAgreement(String agreementId);
}
