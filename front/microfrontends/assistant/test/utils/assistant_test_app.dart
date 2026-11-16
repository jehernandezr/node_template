import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/mf_assistant.dart';
import 'package:mf_assistant/src/data/assistant_repository.dart';
import 'package:mf_assistant/src/l10n/generated/assistant_localizations.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// Session that can use the assistant and create tasks.
UserSession writerSession({String userId = 'user-1'}) =>
    SessionBuilder(userId: userId)
        .withPermissions([Permission.tasksWrite])
        .withFeatures([PlanFeature.aiAssistant])
        .build();

/// Session that can use the assistant but not create tasks.
UserSession readerSession() =>
    SessionBuilder(userId: 'user-2')
        .withFeatures([PlanFeature.aiAssistant])
        .build();

/// App with the shared texts, and the assistant texts installed on [home] the
/// way the manifest installs them.
Widget assistantTestApp(
  Widget home, {
  UserSession? session,
  Locale locale = const Locale('es'),
}) => TestApp(locale: locale, session: session ?? writerSession()).wrap(
  DeferredLocalizations(
    delegates: const [AssistantLocalizations.delegate],
    child: home,
  ),
);

/// Pumps the real manifest routes, starting at [location], over a demo scope
/// whose assistant repository is [repository]. It does not settle: the
/// loading view animates forever, so the caller pumps what it needs.
///
/// Pass [scope] to close it in the middle of the test, as the shell does when
/// the identity changes; disposing it twice is harmless.
Future<GoRouter> pumpAssistantRoutes(
  WidgetTester tester, {
  required AssistantRepository repository,
  String location = '/assistant',
  UserSession? session,
  Locale locale = const Locale('es'),
  TestScope? scope,
}) async {
  final testScope = (scope ?? TestScope(userId: session?.userId ?? 'user-1'))
    ..withRepository<AssistantRepository>(repository);
  addTearDown(testScope.scope.dispose);
  final router = GoRouter(
    initialLocation: location,
    routes: assistantManifest.buildRoutes(
      DeferredLibraryLoader().page,
      () => testScope.scope,
    ),
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    TestApp(
      locale: locale,
      session: session ?? writerSession(),
      delegates: const [],
    ).wrapRouter(router),
  );
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 10));
  }
  return router;
}
