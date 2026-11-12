// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'tasks_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class TasksLocalizationsEs extends TasksLocalizations {
  TasksLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get screenTitle => 'Tareas';

  @override
  String get newTask => 'Nueva tarea';

  @override
  String get editTaskTitle => 'Editar tarea';

  @override
  String get detailTitle => 'Tarea';

  @override
  String get filterAll => 'Todas';

  @override
  String get filterOpen => 'Abiertas';

  @override
  String get filterInProgress => 'En progreso';

  @override
  String get filterDone => 'Hechas';

  @override
  String get statusOpen => 'Abierta';

  @override
  String get statusInProgress => 'En progreso';

  @override
  String get statusDone => 'Hecha';

  @override
  String get searchHint => 'Buscar por título o descripción';

  @override
  String get emptyTitle => 'No hay tareas';

  @override
  String get emptyMessage => 'Crea una tarea para empezar.';

  @override
  String get emptySearchTitle => 'Sin resultados';

  @override
  String get emptySearchMessage => 'Prueba con otro texto.';

  @override
  String get selectTask => 'Selecciona una tarea para verla aquí.';

  @override
  String get loadError => 'No se pudieron cargar las tareas.';

  @override
  String get detailError => 'No se pudo cargar la tarea.';

  @override
  String get detailNotFound => 'La tarea no existe.';

  @override
  String get saveError => 'No se pudo guardar la tarea.';

  @override
  String get deleteError => 'No se pudo eliminar la tarea.';

  @override
  String get titleLabel => 'Título';

  @override
  String get titleRequired => 'Escribe un título.';

  @override
  String get descriptionLabel => 'Descripción';

  @override
  String get statusLabel => 'Estado';

  @override
  String get noDescription => 'Sin descripción';

  @override
  String get deleteTitle => '¿Eliminar tarea?';

  @override
  String get deleteMessage => 'Esta acción no se puede deshacer.';
}
