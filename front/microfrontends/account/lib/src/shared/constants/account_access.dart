import 'package:shell_core/shell_core.dart';

import 'account_constants.dart';

/// Segundo factor reciente, que piden las acciones sensibles y la ruta de
/// seguridad.
final AccessRule accountStepUpRule = AccessRule.mfa(accountStepUpMaxAge);
