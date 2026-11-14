import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import 'task_detail_view.dart';
import '../shared/constants/tasks_paths.dart';

/// Route `/tasks/:id`: a task on its own page, with its own app bar.
class TaskDetailScreen extends StatelessWidget {
  /// Creates the page of the task [taskId].
  const TaskDetailScreen({
    super.key,
    required this.repository,
    required this.taskId,
  });

  final TasksRepository repository;
  final String taskId;

  @override
  Widget build(BuildContext context) => AppPage(
    title: TasksLocalizations.of(context).detailTitle,
    // A deep link has nothing to pop: go to the list.
    onBack: () => context.go(TasksPaths.list),
    body: TaskDetailView(
      repository: repository,
      taskId: taskId,
      onDeleted: () => context.go(TasksPaths.list),
    ),
  );
}
