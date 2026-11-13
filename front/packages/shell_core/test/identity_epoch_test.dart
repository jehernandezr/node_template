import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'support/fakes.dart';

/// Object of one identity: knows whom it was created for.
final class _Profile {
  _Profile(this.userId);

  final String userId;
}

/// Screen that copies its data into state once, as real screens do with a
/// repository in initState. Without a rebuild it would keep the old user.
class _ProfileScreen extends StatefulWidget {
  const _ProfileScreen({required this.profile});

  final _Profile profile;

  @override
  State<_ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<_ProfileScreen> {
  late final String _shown = widget.profile.userId;

  @override
  Widget build(BuildContext context) => Text('user: $_shown');
}

_Profile _profileOf(MicrofrontendScope scope) =>
    scope.get<_Profile>((services) => _Profile(services.session.userId!));

UserSession _user(String id) => UserSession(
  userId: id,
  tenantId: 't1',
  permissions: {Permission.tasksRead},
);

Future<GoRouter> _pump(
  WidgetTester tester,
  MicrofrontendRegistry registry,
  ValueNotifier<UserSession> session,
  String location,
) async {
  // Not started and not disposed: its futures belong to the test's fake zone,
  // so awaiting them from a tear-down would never finish.
  final runtime = fakeRuntime(registry: registry, session: session);
  final router = buildShellRouter(
    registry: registry,
    platform: AppPlatform.web,
    runtime: runtime,
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const Text('login')),
      GoRoute(path: '/forbidden', builder: (_, _) => const Text('forbidden')),
    ],
    shellBuilder: (context, state, child) => child,
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    WidgetsApp.router(color: const Color(0xFF000000), routerConfig: router),
  );
  router.go(location);
  await tester.pumpAndSettle();
  return router;
}

void main() {
  setUp(resetDeferredPageCache);

  testWidgets('a mounted screen route shows fresh data after a user switch', (
    tester,
  ) async {
    final session = ValueNotifier(_user('u1'));
    final registry = MicrofrontendRegistry()
      ..register(
        fakeManifest(
          id: MicrofrontendId.tasks,
          access: AccessRule.permissions([Permission.tasksRead]),
          screens: [
            ScreenRoute(
              path: '/tasks',
              loadLibrary: () async {},
              builder: (scope, {params = const {}}) =>
                  _ProfileScreen(profile: _profileOf(scope)),
            ),
          ],
        ),
      );
    await _pump(tester, registry, session, '/tasks');
    expect(find.text('user: u1'), findsOneWidget);

    session.value = _user('u2');
    await tester.pumpAndSettle();

    expect(find.text('user: u2'), findsOneWidget);
    expect(find.text('user: u1'), findsNothing);
  });

  testWidgets('a permission-only change keeps the mounted state', (
    tester,
  ) async {
    final session = ValueNotifier(_user('u1'));
    var builds = 0;
    final registry = MicrofrontendRegistry()
      ..register(
        fakeManifest(
          id: MicrofrontendId.tasks,
          screens: [
            ScreenRoute(
              path: '/tasks',
              loadLibrary: () async {},
              builder: (scope, {params = const {}}) {
                builds++;
                return _ProfileScreen(profile: _profileOf(scope));
              },
            ),
          ],
        ),
      );
    await _pump(tester, registry, session, '/tasks');
    final state = tester.state(find.byType(_ProfileScreen));

    session.value = UserSession(
      userId: 'u1',
      tenantId: 't1',
      permissions: {Permission.tasksRead, Permission.tasksWrite},
    );
    await tester.pumpAndSettle();
    expect(tester.state(find.byType(_ProfileScreen)), same(state));
    expect(builds, greaterThanOrEqualTo(1));
  });

  testWidgets('screen builders receive path and query parameters', (
    tester,
  ) async {
    final session = ValueNotifier(_user('u1'));
    final registry = MicrofrontendRegistry()
      ..register(
        fakeManifest(
          id: MicrofrontendId.tasks,
          screens: [
            ScreenRoute(
              path: '/tasks',
              loadLibrary: () async {},
              builder: (scope, {params = const {}}) => const Text('list'),
              routes: [
                ScreenRoute(
                  path: ':id',
                  loadLibrary: () async {},
                  builder: (scope, {params = const {}}) =>
                      Text('task ${params['id']} tab ${params['tab']}'),
                ),
              ],
            ),
          ],
        ),
      );
    await _pump(tester, registry, session, '/tasks/42?tab=history&id=ignored');
    expect(find.text('task 42 tab history'), findsOneWidget);
  });

  testWidgets(
    'sign-out never builds the mounted page for the anonymous session',
    (tester) async {
      final session = ValueNotifier(_user('u1'));
      final builtFor = <String?>[];
      final registry = MicrofrontendRegistry()
        ..register(
          fakeManifest(
            id: MicrofrontendId.tasks,
            access: AccessRule.permissions([Permission.tasksRead]),
            screens: [
              ScreenRoute(
                path: '/tasks',
                loadLibrary: () async {},
                builder: (scope, {params = const {}}) {
                  builtFor.add(scope.services.session.userId);
                  return const Text('tasks');
                },
              ),
            ],
          ),
        );
      final router = await _pump(tester, registry, session, '/tasks');

      session.value = UserSession.anonymous();
      await tester.pumpAndSettle();

      expect(router.routerDelegate.currentConfiguration.uri.path, '/login');
      expect(builtFor, isNot(contains(null)));
    },
  );
}
