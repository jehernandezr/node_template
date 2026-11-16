import 'package:shell_core/shell_core.dart';

/// Access rules of the assistant.
abstract final class AssistantAccess {
  /// Permission needed to confirm the actions the assistant proposes (they
  /// create tasks). Without it the user can only reject them.
  static final AccessRule tools = AccessRule.permissions([
    Permission.tasksWrite,
  ]);
}
