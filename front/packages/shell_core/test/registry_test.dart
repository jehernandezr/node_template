import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/fakes.dart';

void main() {
  final anonymous = UserSession.anonymous();
  final reader = UserSession(
    userId: 'u1',
    tenantId: 't1',
    permissions: {Permission.tasksRead},
  );
  final flagged = UserSession(
    userId: 'u1',
    tenantId: 't1',
    permissions: {Permission.tasksRead},
    flags: {FeatureFlag.newReports},
  );

  late MicrofrontendRegistry registry;

  setUp(() {
    registry = MicrofrontendRegistry()
      ..register(fakeManifest(id: TestIds.account))
      ..register(
        fakeManifest(id: TestIds.billing, platforms: {AppPlatform.web}),
      )
      ..register(
        fakeManifest(
          id: TestIds.tasks,
          access: AccessRule.permissions([Permission.tasksRead]),
          routePath: '/tasks',
        ),
      )
      ..register(
        fakeManifest(
          id: TestIds.backoffice,
          access: AccessRule.permissions([Permission.backofficeAccess]),
        ),
      )
      ..register(
        fakeManifest(id: TestIds.assistant, flag: FeatureFlag.newReports),
      );
  });

  List<MicrofrontendId> ids(Iterable<MicrofrontendManifest> items) =>
      items.map((item) => item.id).toList();

  test('filters by platform', () {
    expect(ids(registry.visibleFor(reader, AppPlatform.mobile)), [
      TestIds.account,
      TestIds.tasks,
    ]);
    expect(ids(registry.visibleFor(reader, AppPlatform.web)), [
      TestIds.account,
      TestIds.billing,
      TestIds.tasks,
    ]);
  });

  test('filters by permission', () {
    expect(ids(registry.visibleFor(anonymous, AppPlatform.web)), [
      TestIds.account,
      TestIds.billing,
    ]);
  });

  test('flag-gated manifest is visible only with the flag', () {
    expect(
      ids(registry.visibleFor(reader, AppPlatform.web)),
      isNot(contains(TestIds.assistant)),
    );
    expect(
      ids(registry.visibleFor(flagged, AppPlatform.web)),
      contains(TestIds.assistant),
    );
  });

  test('isVisibleTo is false for unknown ids through the registry', () {
    expect(registry.manifestFor(TestIds.verifier), isNull);
    expect(
      registry.manifestFor(TestIds.tasks)!.isVisibleTo(reader, AppPlatform.web),
      isTrue,
    );
    expect(
      registry
          .manifestFor(TestIds.tasks)!
          .isVisibleTo(anonymous, AppPlatform.web),
      isFalse,
    );
  });

  test('duplicate registration throws StateError', () {
    expect(
      () => registry.register(fakeManifest(id: TestIds.tasks)),
      throwsStateError,
    );
  });

  test('menuFor sorts visible entries by order', () {
    final ordered = MicrofrontendRegistry()
      ..register(fakeManifest(id: TestIds.tasks, order: 2))
      ..register(fakeManifest(id: TestIds.account, order: 1))
      ..register(fakeManifest(id: TestIds.billing, order: 3))
      ..register(
        fakeManifest(
          id: TestIds.backoffice,
          order: 0,
          access: AccessRule.permissions([Permission.backofficeAccess]),
        ),
      );

    final menu = ordered.menuFor(anonymous, AppPlatform.web);
    expect(menu.map((entry) => entry.path), ['/account', '/tasks', '/billing']);
    expect(
      ordered
          .menuFor(
            UserSession(
              userId: 'a',
              permissions: {Permission.backofficeAccess},
            ),
            AppPlatform.web,
          )
          .first
          .path,
      '/backoffice',
    );
  });

  test('finds the manifest that owns the first segment of a location', () {
    expect(registry.manifestForPath('/tasks/42?x=1')?.id, TestIds.tasks);
    expect(registry.manifestForPath('/account'), isNotNull);
    expect(registry.manifestForPath('/login'), isNull);
    expect(registry.manifestForPath('/'), isNull);
  });

  test('rejects an id that is not a URL segment', () {
    expect(
      () => MicrofrontendRegistry().register(
        fakeManifest(id: const MicrofrontendId('Tasks/x')),
      ),
      throwsStateError,
    );
  });

  test('rejects a menu label without every supported language', () {
    expect(
      () => MicrofrontendRegistry().register(
        MicrofrontendManifest(
          id: TestIds.tasks,
          platforms: {AppPlatform.web},
          access: AccessRule.public(),
          menu: const [
            MenuEntry(
              label: MenuLabel({'es': 'Tareas'}),
              path: '/tasks',
              order: 1,
              icon: Icons.circle_outlined,
            ),
          ],
        ),
      ),
      throwsStateError,
    );
  });

  group('deep links', () {
    MicrofrontendManifest linked(Set<AppPlatform> platforms) =>
        MicrofrontendManifest(
          id: TestIds.tasks,
          platforms: platforms,
          access: AccessRule.public(),
          menu: const [],
          deepLinks: (rest, query) => switch (rest) {
            ['escape'] => '/account',
            [final id] => '/tasks/$id',
            _ => null,
          },
        );

    test('the owner of the first segment resolves the rest', () {
      final links = MicrofrontendRegistry()
        ..register(linked({AppPlatform.mobile}));
      expect(
        links.resolveDeepLink(['tasks', '42'], const {}, AppPlatform.mobile),
        '/tasks/42',
      );
      expect(
        links.resolveDeepLink(['tasks'], const {}, AppPlatform.mobile),
        isNull,
      );
      expect(
        links.resolveDeepLink(['billing', '1'], const {}, AppPlatform.mobile),
        isNull,
      );
      // A location outside the microfrontend's own routes is refused.
      expect(
        links.resolveDeepLink(
          ['tasks', 'escape'],
          const {},
          AppPlatform.mobile,
        ),
        isNull,
      );
    });

    test('a microfrontend of another platform resolves nothing', () {
      final links = MicrofrontendRegistry()
        ..register(linked({AppPlatform.web}));
      expect(
        links.resolveDeepLink(['tasks', '42'], const {}, AppPlatform.mobile),
        isNull,
      );
    });
  });

  test('a menu label picks the language of the locale or the first one', () {
    const label = MenuLabel({'es': 'Tareas', 'en': 'Tasks'});
    expect(label.resolve(const Locale('en', 'US')), 'Tasks');
    expect(label.resolve(const Locale('fr')), 'Tareas');
  });

  test(
    'a menu badge follows the latest event, the replayed one first',
    () async {
      final bus = ShellEventBus();
      addTearDown(bus.dispose);
      bus.emit(const CountChanged(2));
      const badge = MenuBadge<CountChanged>(_countOf);
      final counts = <int>[];
      final subscription = badge.watch(bus).listen(counts.add);
      addTearDown(subscription.cancel);

      bus.emit(const CountChanged(5));
      await pumpEventQueue();

      expect(counts, [2, 5]);
    },
  );
}

int _countOf(CountChanged event) => event.count;
