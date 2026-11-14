import 'package:shell_core/shell_core.dart';

/// Id of the microfrontend and first segment of its routes.
const MicrofrontendId tasksId = MicrofrontendId('tasks');

/// Menu label. The shell draws it before the microfrontend loads, so it
/// travels with the manifest instead of the deferred ARB files.
const MenuLabel tasksMenuLabel = MenuLabel({'es': 'Tareas', 'en': 'Tasks'});

/// Routes of the tasks microfrontend. The manifest and the screens build
/// every location from here.
abstract final class TasksPaths {
  /// The list, root of the microfrontend.
  static const String list = '/tasks';

  /// Segment of the create form, child of [list].
  static const String newSegment = 'new';

  /// Segment of the edit form, child of a task.
  static const String editSegment = 'edit';

  /// Name of the task id path parameter.
  static const String idParam = 'id';

  /// Child segments of [list] that name a page, not a task, so they are never
  /// read as an id.
  static const Set<String> reservedSegments = {newSegment, editSegment};

  /// The create form.
  static const String create = '$list/$newSegment';

  /// Detail of the task [id].
  static String detail(String id) => '$list/$id';

  /// Edit form of the task [id].
  static String edit(String id) => '$list/$id/$editSegment';
}
