import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../../shared/constants/account_access.dart';
import 'account_widgets.dart';

/// Pide al shell un segundo factor reciente (su página `/step-up`).
///
/// La cuenta no verifica códigos por su cuenta: el shell ejecuta el flujo MFA
/// y actualiza `UserSession.mfaVerifiedAt` y los tokens, así que tras un sí
/// `context.can(accountStepUpRule)` pasa y la API deja de responder
/// `IDENTITY.MFA.STEP_UP_REQUIRED`.
typedef StepUpRequest = Future<bool> Function();

/// Devuelve true si la sesión ya tiene un segundo factor reciente o si el
/// usuario lo completa en el step-up del shell.
Future<bool> confirmStepUp(
  BuildContext context,
  StepUpRequest requestStepUp,
) async {
  if (context.can(accountStepUpRule)) return true;
  final verified = await requestStepUp();
  return verified && context.mounted;
}

/// Confirma con MFA y, si pasa, ejecuta [action]. Devuelve true si se completó.
Future<bool> runSensitiveAction(
  BuildContext context,
  StepUpRequest requestStepUp,
  Future<void> Function() action, {
  required String Function() success,
}) async {
  final verified = await confirmStepUp(context, requestStepUp);
  if (!verified || !context.mounted) return false;
  return runAccountAction(context, action, success: success);
}
