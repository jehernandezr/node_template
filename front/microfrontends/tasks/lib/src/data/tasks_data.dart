import 'package:shell_core/shell_core.dart';

import '../shared/constants/tasks_demo.dart';
import 'fake_tasks_repository.dart';
import 'tasks_repository.dart';

/// How the tasks repository is created. Tasks has no API contract yet, so it
/// only exists in demo mode, with an artificial latency.
abstract final class TasksData {
  static final RepositoryBinding<TasksRepository> repository =
      RepositoryBinding<TasksRepository>.demoOnly(
        demo: (services) =>
            FakeTasksRepository(behavior: DemoBehavior(delay: tasksDemoDelay)),
      );
}
