import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

import 'support/fakes.dart';

MicrofrontendScope _unusedScope(MicrofrontendId id) =>
    throw UnimplementedError('not used by this test');

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
    featureFlags: {FeatureFlag.newReports},
  );

  late MicrofrontendRegistry registry;

  setUp(() {
    registry = MicrofrontendRegistry()
      ..register(fakeManifest(id: MicrofrontendId.account))
      ..register(
        fakeManifest(id: MicrofrontendId.billing, platforms: {AppPlatform.web}),
      )
      ..register(
        fakeManifest(
          id: MicrofrontendId.tasks,
          access: AccessRule.permissions([Permission.tasksRead]),
          routePath: '/tasks',
        ),
      )
      ..register(
        fakeManifest(
          id: MicrofrontendId.backoffice,
          access: AccessRule.permissions([Permission.backofficeAccess]),
        ),
      )
      ..register(
        fakeManifest(
          id: MicrofrontendId.assistant,
          flag: FeatureFlag.newReports,
        ),
      );
  });

  List<MicrofrontendId> ids(Iterable<MicrofrontendManifest> items) =>
      items.map((item) => item.id).toList();

  test('filters by platform', () {
    expect(ids(registry.visibleFor(reader, AppPlatform.mobile)), [
      MicrofrontendId.account,
      MicrofrontendId.tasks,
    ]);
    expect(ids(registry.visibleFor(reader, AppPlatform.web)), [
      MicrofrontendId.account,
      MicrofrontendId.billing,
      MicrofrontendId.tasks,
    ]);
  });

  test('filters by permission', () {
    expect(ids(registry.visibleFor(anonymous, AppPlatform.web)), [
      MicrofrontendId.account,
      MicrofrontendId.billing,
    ]);
  });

  test('flag-gated manifest is visible only with the flag', () {
    expect(
      ids(registry.visibleFor(reader, AppPlatform.web)),
      isNot(contains(MicrofrontendId.assistant)),
    );
    expect(
      ids(registry.visibleFor(flagged, AppPlatform.web)),
      contains(MicrofrontendId.assistant),
    );
  });

  test('isVisibleTo is false for unknown ids through the registry', () {
    expect(registry.manifestFor(MicrofrontendId.verifier), isNull);
    expect(
      registry
          .manifestFor(MicrofrontendId.tasks)!
          .isVisibleTo(reader, AppPlatform.web),
      isTrue,
    );
    expect(
      registry
          .manifestFor(MicrofrontendId.tasks)!
          .isVisibleTo(anonymous, AppPlatform.web),
      isFalse,
    );
  });

  test('duplicate registration throws StateError', () {
    expect(
      () => registry.register(fakeManifest(id: MicrofrontendId.tasks)),
      throwsStateError,
    );
  });

  test('menuFor sorts visible entries by order', () {
    final ordered = MicrofrontendRegistry()
      ..register(fakeManifest(id: MicrofrontendId.tasks, order: 2))
      ..register(fakeManifest(id: MicrofrontendId.account, order: 1))
      ..register(fakeManifest(id: MicrofrontendId.billing, order: 3))
      ..register(
        fakeManifest(
          id: MicrofrontendId.backoffice,
          order: 0,
          access: AccessRule.permissions([Permission.backofficeAccess]),
        ),
      );

    final menu = ordered.menuFor(anonymous, AppPlatform.web);
    expect(menu.map((entry) => entry.labelKey), [
      'menu.account',
      'menu.tasks',
      'menu.billing',
    ]);
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
          .labelKey,
      'menu.backoffice',
    );
  });

  test(
    'routesFor builds routes for the platform, regardless of visibility',
    () {
      // Only tasks has a route. Billing is web only and has none, so mobile still gets one route.
      expect(
        registry.routesFor(AppPlatform.web, deferredPage, _unusedScope),
        hasLength(1),
      );
      expect(
        registry.routesFor(AppPlatform.mobile, deferredPage, _unusedScope),
        hasLength(1),
      );
    },
  );
}
