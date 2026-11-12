import '../data/task.dart';
import '../l10n/generated/tasks_localizations.dart';

/// Label of a [TaskStatus] in the language of [l10n].
String taskStatusLabel(TasksLocalizations l10n, TaskStatus status) =>
    switch (status) {
      TaskStatus.open => l10n.statusOpen,
      TaskStatus.inProgress => l10n.statusInProgress,
      TaskStatus.done => l10n.statusDone,
    };
