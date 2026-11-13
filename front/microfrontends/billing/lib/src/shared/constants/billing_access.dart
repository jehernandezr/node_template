import 'package:shell_core/shell_core.dart';

/// Rule of the billing permission, the one that guards the microfrontend.
///
/// The manifest, its sub-routes and the actions that change the subscription
/// use it. There is no separate billing write permission in the contracts, so
/// changing a plan needs the same permission as reading billing; the API still
/// decides.
final AccessRule billingAccessRule = AccessRule.permissions([
  Permission.billingRead,
]);
