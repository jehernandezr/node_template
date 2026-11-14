import 'package:contracts/contracts.dart';

/// Second factors that the flows of this package can complete with a code.
/// A passkey needs WebAuthn, which they do not have yet.
const Set<MfaFactor> codeMfaMethods = {
  MfaFactor.deviceOtp,
  MfaFactor.emailOtp,
  MfaFactor.totp,
  MfaFactor.recoveryCode,
};
