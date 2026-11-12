// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'tasks_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class TasksLocalizationsEn extends TasksLocalizations {
  TasksLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get screenTitle => 'Tasks';

  @override
  String get newTask => 'New task';

  @override
  String get editTaskTitle => 'Edit task';

  @override
  String get detailTitle => 'Task';

  @override
  String get filterAll => 'All';

  @override
  String get filterOpen => 'Open';

  @override
  String get filterInProgress => 'In progress';

  @override
  String get filterDone => 'Done';

  @override
  String get statusOpen => 'Open';

  @override
  String get statusInProgress => 'In progress';

  @override
  String get statusDone => 'Done';

  @override
  String get searchHint => 'Search by title or description';

  @override
  String get emptyTitle => 'No tasks';

  @override
  String get emptyMessage => 'Create a task to get started.';

  @override
  String get emptySearchTitle => 'No results';

  @override
  String get emptySearchMessage => 'Try a different text.';

  @override
  String get selectTask => 'Select a task to see it here.';

  @override
  String get loadError => 'The tasks could not be loaded.';

  @override
  String get detailError => 'The task could not be loaded.';

  @override
  String get detailNotFound => 'The task does not exist.';

  @override
  String get saveError => 'The task could not be saved.';

  @override
  String get deleteError => 'The task could not be deleted.';

  @override
  String get titleLabel => 'Title';

  @override
  String get titleRequired => 'Enter a title.';

  @override
  String get descriptionLabel => 'Description';

  @override
  String get statusLabel => 'Status';

  @override
  String get noDescription => 'No description';

  @override
  String get deleteTitle => 'Delete task?';

  @override
  String get deleteMessage => 'This action cannot be undone.';
}
