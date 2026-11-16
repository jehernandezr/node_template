import 'package:shell_core/shell_core.dart';

import 'account_constants.dart';

/// A recent second factor, required by the sensitive actions and the
/// security route.
final AccessRule accountStepUpRule = AccessRule.mfa(accountStepUpMaxAge);
