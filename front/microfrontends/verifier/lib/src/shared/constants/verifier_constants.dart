import 'package:contracts/contracts.dart';

/// Digits of the code a device generates for a login challenge. It comes from
/// the identity contract so the front and the backend agree.
const int verifierCodeLength = MfaRules.deviceCodeLength;

/// Digits per group when the code is shown, e.g. `1234 5678`.
const int verifierCodeGroupSize = 4;

/// How often the countdown of a challenge updates.
const Duration verifierTick = Duration(seconds: 1);
