import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// Sessions the billing tests run with.
abstract final class BillingSessions {
  /// Reads billing and can change the subscription.
  static UserSession writer() => SessionBuilder().withPermissions({
    Permission.billingRead,
    Permission.billingWrite,
  }).build();

  /// Reads billing but cannot change the subscription.
  static UserSession reader() =>
      SessionBuilder().withPermissions({Permission.billingRead}).build();

  /// Signed in, without the billing permission.
  static UserSession none() => SessionBuilder().build();
}
