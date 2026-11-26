import 'package:shell_core/shell_core.dart';

import '../shared/constants/tasks_demo.dart';
import 'api_tasks_repository.dart';
import 'fake_tasks_repository.dart';
import 'tasks_repository.dart';

/// How the tasks repository is created for each shell mode: in memory with
/// an artificial latency in demo, over the tasks API in live.
abstract final class TasksData {
  /// How the tasks repository is created in each shell mode.
  static final RepositoryBinding<TasksRepository> repository =
      RepositoryBinding<TasksRepository>(
        demo: (services) =>
            FakeTasksRepository(behavior: DemoBehavior(delay: tasksDemoDelay)),
        live: (services) => ApiTasksRepository(client: services.api),
      );
}
