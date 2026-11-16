import 'package:shell_core/shell_core.dart';

import 'billing_repository.dart';
import 'fake_billing_repository.dart';

/// How the billing repository is created. Billing has no contract yet, so it
/// only serves the demo mode (the manifest declares `modes: {demo}`).
abstract final class BillingData {
  static final RepositoryBinding<BillingRepository> repository =
      RepositoryBinding<BillingRepository>.demoOnly(
        demo: (services) => FakeBillingRepository(behavior: DemoBehavior()),
      );
}
