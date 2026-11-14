import 'package:shell_core/shell_core.dart';

/// Rule of the billing read permission, the one that guards the
/// microfrontend.
///
/// The manifest and its sub-routes use it: whoever reads billing sees the
/// plan, the usage and the invoices.
final AccessRule billingAccessRule = AccessRule.permissions([
  Permission.billingRead,
]);

/// Rule of the actions that change the subscription, such as changing the
/// plan: `billing:write` on top of reading billing. The API still decides.
final AccessRule billingWriteRule = AccessRule.permissions([
  Permission.billingRead,
  Permission.billingWrite,
]);
