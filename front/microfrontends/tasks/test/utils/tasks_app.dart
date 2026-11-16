import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_tasks/mf_tasks.dart';
import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:mf_tasks/src/shared/constants/tasks_paths.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// Harness of the tasks screens: the real manifest routes over a session with
/// chosen permissions, in the locale given.
final class TasksTestApp {
  const TasksTestApp({
    this.permissions = readWrite,
    this.locale = const Locale('es'),
  });

  /// Permissions of a user who can read and write tasks.
  static const Set<Permission> readWrite = {
    Permission.tasksRead,
    Permission.tasksWrite,
  };

  /// Permissions of a user who can only read tasks.
  static const Set<Permission> readOnly = {Permission.tasksRead};

  /// Text of the stand-in for the shell's forbidden page.
  static const String forbiddenText = 'forbidden-page';

  final Set<Permission> permissions;
  final Locale locale;

  /// App that runs the manifest routes from [location]. Rejected requests land
  /// on the forbidden page.
  Widget wrap(MicrofrontendScope scope, {String location = TasksPaths.list}) {
    final router = GoRouter(
      initialLocation: location,
      routes: [
        ...tasksManifest.buildRoutes(DeferredLibraryLoader().page, () => scope),
        GoRoute(
          path: '/forbidden',
          builder: (_, _) => const Text(forbiddenText),
        ),
      ],
    );
    return TestApp(
      locale: locale,
      session: SessionBuilder().withPermissions(permissions).build(),
    ).wrapRouter(router);
  }

  /// Scope of one identity in demo mode. Each call is a new identity.
  static MicrofrontendScope newScope({String userId = 'user-1'}) =>
      TestScope(userId: userId).scope;

  /// Scope whose tasks repository is [repository].
  static MicrofrontendScope scopeWith(TasksRepository repository) =>
      TestScope().withRepository<TasksRepository>(repository).scope;

  /// Pumps the app over a scope that holds [repository].
  static Future<void> pump(
    WidgetTester tester,
    TasksRepository repository, {
    String location = TasksPaths.list,
    Locale locale = const Locale('es'),
    Set<Permission> permissions = readWrite,
  }) => tester.pumpWidget(
    TasksTestApp(
      permissions: permissions,
      locale: locale,
    ).wrap(scopeWith(repository), location: location),
  );

  /// Id of the first task of [repository], which is the first seed task.
  static Future<String> firstId(
    WidgetTester tester,
    TasksRepository repository,
  ) async => (await tester.runAsync(() => repository.list()))!.items.first.id;

  /// Scrolls the task list until [finder] is on screen.
  static Future<void> scrollListTo(WidgetTester tester, Finder finder) =>
      tester.scrollUntilVisible(
        finder,
        300,
        scrollable: find.descendant(
          of: find.byType(ListView),
          matching: find.byType(Scrollable),
        ),
      );
}
