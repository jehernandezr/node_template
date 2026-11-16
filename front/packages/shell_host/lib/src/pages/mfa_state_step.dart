import 'package:auth/auth.dart';

/// The resting step behind any state, so a form draws one view per step.
extension MfaStateStep on MfaState {
  MfaStep get step => switch (this) {
    final MfaStep s => s,
    MfaBusy(:final step) => step,
    MfaFailed(:final step) => step,
  };
}
