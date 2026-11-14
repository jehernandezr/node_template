import 'package:contracts/contracts.dart';

/// Segundos factores que los flujos de este paquete saben completar con un
/// código. Una passkey necesita WebAuthn, que todavía no tienen.
const Set<MfaFactor> codeMfaMethods = {
  MfaFactor.deviceOtp,
  MfaFactor.emailOtp,
  MfaFactor.totp,
  MfaFactor.recoveryCode,
};
