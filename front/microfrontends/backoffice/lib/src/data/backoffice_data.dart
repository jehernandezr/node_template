import 'package:shell_core/shell_core.dart';

import 'backoffice_repository.dart';
import 'fake_backoffice_repository.dart';

/// How the backoffice gets its repository. Demo only: the backoffice API has
/// no contract yet.
abstract final class BackofficeData {
  /// One repository per identity, created on first use and disposed with the
  /// scope.
  static final RepositoryBinding<BackofficeRepository> repository =
      RepositoryBinding<BackofficeRepository>.demoOnly(
        demo: (services) => FakeBackofficeRepository(behavior: DemoBehavior()),
      );
}
