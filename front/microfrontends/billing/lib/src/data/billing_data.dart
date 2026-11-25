import 'package:shell_core/shell_core.dart';

import 'api_billing_repository.dart';
import 'billing_repository.dart';
import 'fake_billing_repository.dart';

/// How the billing repository is created for each shell mode: in memory in
/// demo, over the billing API in live.
abstract final class BillingData {
  static final RepositoryBinding<BillingRepository> repository =
      RepositoryBinding<BillingRepository>(
        demo: (services) => FakeBillingRepository(behavior: DemoBehavior()),
        live: (services) => ApiBillingRepository(client: services.api),
      );
}
