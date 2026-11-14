import 'package:shell_core/shell_core.dart';

/// Rule to see the tasks microfrontend and its list and detail screens.
final AccessRule tasksReadRule = AccessRule.permissions([Permission.tasksRead]);

/// Rule to create, edit and delete tasks. Guards the `new` and `edit` routes
/// and every button that writes.
final AccessRule tasksWriteRule = AccessRule.permissions([
  Permission.tasksWrite,
]);
