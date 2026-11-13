import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_backoffice/mf_backoffice.dart';
import 'package:mf_backoffice/src/shared/constants/backoffice_access.dart';
import 'package:shell_core/shell_core.dart';

import 'support/harness.dart';

/// Full path and access rule of every screen, including nested children.
Map<String, AccessRule?> _screens(
  List<ScreenRoute> routes, [
  String parent = '',
]) => {
  for (final route in routes) ...{
    _join(parent, route.path): route.access,
    ..._screens(route.routes, _join(parent, route.path)),
  },
};

String _join(String parent, String path) =>
    path.startsWith('/') ? path : '$parent/$path';

/// Full paths of the [GoRoute]s built from the manifest.
Iterable<String> _goPaths(List<RouteBase> routes, [String parent = '']) sync* {
  for (final route in routes.whereType<GoRoute>()) {
    final full = _join(parent, route.path);
    yield full;
    yield* _goPaths(route.routes, full);
  }
}

void main() {
  test('id, platform and menu', () {
    expect(backofficeManifest.id, MicrofrontendId.backoffice);
    expect(backofficeManifest.platforms, {AppPlatform.web});
    expect(backofficeManifest.menu.single.path, '/backoffice');
    expect(backofficeManifest.menu.single.labelKey, 'menuBackoffice');
    expect(backofficeManifest.hasLifecycle, isFalse);
  });

  test('screens are nested under /backoffice', () {
    expect(_screens(backofficeManifest.screens).keys, [
      '/backoffice',
      '/backoffice/tenants',
      '/backoffice/tenants/:id',
      '/backoffice/sagas',
      '/backoffice/sagas/:id',
      '/backoffice/dlq',
      '/backoffice/dlq/:queue',
    ]);
    expect(backofficeManifest.screens, hasLength(1));
  });

  test('buildRoutes yields the same tree as GoRoutes', () {
    final routes = backofficeManifest.buildRoutes(deferredPage, newScope);
    final paths = _goPaths(routes).toList();
    expect(paths, _screens(backofficeManifest.screens).keys.toList());
    for (final path in paths) {
      expect(path, startsWith('/backoffice'));
    }
  });

  test(
    'sagas and dlq are guarded for operations readers; children inherit',
    () {
      final access = _screens(backofficeManifest.screens);
      expect(access['/backoffice'], isNull);
      expect(access['/backoffice/tenants'], isNull);
      expect(access['/backoffice/tenants/:id'], isNull);
      expect(access['/backoffice/sagas'], same(backofficeOperationsReadAccess));
      expect(access['/backoffice/dlq'], same(backofficeOperationsReadAccess));
      // Child routes run their parent's redirect too.
      expect(access['/backoffice/sagas/:id'], isNull);
      expect(access['/backoffice/dlq/:queue'], isNull);
    },
  );

  test('the MFA window is a 15 minute constant', () {
    expect(backofficeMfaMaxAge, const Duration(minutes: 15));
  });

  group('manifest access', () {
    AccessDecision decide(UserSession session) =>
        backofficeManifest.access.decide(session, now: testNow);

    for (final role in PlatformRole.values) {
      test('${role.name} with a recent second factor enters', () {
        expect(decide(platformUser({role})), AccessDecision.allowed);
        expect(
          decide(platformUser({role}, mfaAge: const Duration(minutes: 15))),
          AccessDecision.allowed,
        );
      });

      test('${role.name} without a recent second factor needs a step-up', () {
        expect(
          decide(platformUser({role}, mfaAge: null)),
          AccessDecision.stepUpRequired,
        );
        expect(
          decide(platformUser({role}, mfaAge: const Duration(minutes: 16))),
          AccessDecision.stepUpRequired,
        );
      });
    }

    test('a tenant role is denied, even with a recent second factor', () {
      expect(decide(tenantUser()), AccessDecision.denied);
    });

    test('an anonymous visitor must sign in', () {
      expect(decide(UserSession.anonymous()), AccessDecision.signInRequired);
    });

    test('the menu entry stays reachable before the step-up', () {
      final session = platformUser({PlatformRole.support}, mfaAge: null);
      expect(
        backofficeManifest.access.reachableBy(session, now: testNow),
        isTrue,
      );
      expect(
        backofficeManifest.access.reachableBy(tenantUser(), now: testNow),
        isFalse,
      );
    });
  });

  group('action rules', () {
    bool canRead(PlatformRole role) => backofficeOperationsReadAccess.allows(
      platformUser({role}),
      now: testNow,
    );
    bool canWrite(PlatformRole role) => backofficeOperationsWriteAccess.allows(
      platformUser({role}),
      now: testNow,
    );

    test('superAdmin and support read and act', () {
      for (final role in [PlatformRole.superAdmin, PlatformRole.support]) {
        expect(canRead(role), isTrue, reason: role.name);
        expect(canWrite(role), isTrue, reason: role.name);
      }
    });

    test('readOnly reads but does not act', () {
      expect(canRead(PlatformRole.readOnly), isTrue);
      expect(canWrite(PlatformRole.readOnly), isFalse);
    });

    test('finance neither reads operations nor acts', () {
      expect(canRead(PlatformRole.finance), isFalse);
      expect(canWrite(PlatformRole.finance), isFalse);
    });
  });
}
