import 'package:shell_core/shell_core.dart';

import '../shared/constants/reports_demo.dart';
import 'api_reports_repository.dart';
import 'fake_reports_repository.dart';
import 'reports_repository.dart';

/// How the reports repository is created for each shell mode: in memory with
/// an artificial latency in demo, over the reports API in live.
abstract final class ReportsData {
  /// How the reports repository is created in each shell mode.
  static final RepositoryBinding<ReportsRepository> repository =
      RepositoryBinding<ReportsRepository>(
        demo: (services) => FakeReportsRepository(
          behavior: DemoBehavior(delay: reportsDemoDelay),
        ),
        live: (services) => ApiReportsRepository(client: services.api),
      );
}
