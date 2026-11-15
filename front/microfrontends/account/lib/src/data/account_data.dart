import 'package:shell_core/shell_core.dart';

import '../shared/constants/account_constants.dart';
import 'account_repository.dart';
import 'api_account_repository.dart';
import 'fake_account_repository.dart';

/// How the account repository is created for each shell mode.
///
/// In demo the data lives in memory with an artificial latency; in live it
/// talks to the identity API, which only serves what has a contract.
abstract final class AccountData {
  static final RepositoryBinding<AccountRepository> repository =
      RepositoryBinding<AccountRepository>(
        demo: (services) => FakeAccountRepository(
          behavior: DemoBehavior(delay: accountDemoDelay),
        ),
        live: (services) => ApiAccountRepository(client: services.api),
      );
}
