import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/mf_backoffice.dart';
import 'package:mf_backoffice/src/data/backoffice_repository.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart' show AppPage;

import 'mounted_backoffice.dart';
import 'shell_pages.dart';

/// Mounts the backoffice manifest for a test: its own clock (MFA ages are
/// measured from [now]) and its own deferred-library loader, so no test reuses
/// a load from another one.
final class BackofficeHarness {
  BackofficeHarness({FakeClock? clock})
    : clock = clock ?? FakeClock(DateTime.utc(2026, 11, 13, 10));

  final FakeClock clock;
  final DeferredLibraryLoader loader = DeferredLibraryLoader();

  /// Current time of the harness.
  DateTime get now => clock.now();

  /// Signed-in platform user with [roles]. The second factor was verified
  /// [mfaAge] ago, or never when [mfaAge] is null.
  UserSession platformUser(
    Set<PlatformRole> roles, {
    Duration? mfaAge = Duration.zero,
  }) {
    final builder = SessionBuilder(
      userId: 'operator-${roles.map((r) => r.name).join('-')}',
      tenantId: null,
    ).withRoles(roles);
    final age = mfaAge;
    if (age != null) builder.mfaVerifiedAt(now.subtract(age));
    return builder.build();
  }

  /// Signed-in tenant user (tenant permissions, no platform role) with a fresh
  /// second factor.
  UserSession tenantUser() => SessionBuilder(userId: 'tenant-admin')
      .withPermissions({
        Permission.tasksRead,
        Permission.tasksWrite,
        Permission.billingRead,
      })
      .mfaVerifiedAt(now)
      .build();

  /// New scope for [session], as the runtime creates one per identity.
  MicrofrontendScope newScope([UserSession? session]) =>
      _scopeFor(session ?? platformUser({PlatformRole.superAdmin}));

  /// Mounts the manifest routes with `backofficeManifest.buildRoutes` in a
  /// plain [GoRouter], under a [ShellAccessScope] for [session], at
  /// [location].
  ///
  /// The manifest's own access rule is the shell's job and is not applied
  /// here; the sub-route rules (`ScreenRoute.access`) and the in-screen checks
  /// are. When [repository] is set, the scope returns it instead of the demo
  /// one. [size] and [textScale] set the surface and the text scale. With
  /// [settle] false it only waits for the deferred library, so a screen that
  /// stays loading can be inspected.
  Future<MountedBackoffice> pump(
    WidgetTester tester, {
    required String location,
    UserSession? session,
    BackofficeRepository? repository,
    MicrofrontendScope? scope,
    Locale locale = const Locale('es'),
    Size size = const Size(1280, 1600),
    double? textScale,
    bool settle = true,
  }) async {
    _view(tester, size, textScale);
    final current = session ?? platformUser({PlatformRole.superAdmin});
    final identity = scope ?? newScope(current);
    if (repository != null) {
      identity.get<BackofficeRepository>((_) => repository);
    }
    final router = GoRouter(
      initialLocation: location,
      routes: [
        ...ShellPages.routes(),
        ...backofficeManifest.buildRoutes(loader.page, () => identity),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      TestApp(
        locale: locale,
        session: current,
        clock: clock.now,
      ).wrapRouter(router),
    );
    if (settle) {
      await tester.pumpAndSettle();
    } else {
      // A deferred load completes on the real event loop, which the fake zone
      // of the test never runs; yielding to it once per frame lets the load
      // finish. It must finish here: the VM keeps the future of a deferred
      // load, and one left pending would never complete for the next tests.
      for (var i = 0; i < 20 && find.byType(AppPage).evaluate().isEmpty; i++) {
        await tester.runAsync(() => Future<void>.delayed(Duration.zero));
        await tester.pump(const Duration(milliseconds: 16));
      }
    }
    return MountedBackoffice(router: router, scope: identity);
  }

  /// Mounts the backoffice through `ShellRouterFactory`, as the web shell
  /// does: the manifest's access rule decides sign-in, step-up or forbidden.
  Future<GoRouter> pumpThroughShell(
    WidgetTester tester, {
    required UserSession session,
    required String location,
  }) async {
    _view(tester, const Size(1280, 1600), null);
    final registry = MicrofrontendRegistry()..register(backofficeManifest);
    final ValueListenable<UserSession> source = ValueNotifier(session);
    final runtime = ShellRuntime(
      registry: registry,
      platform: AppPlatform.web,
      session: source,
      clock: clock.now,
      servicesFactory: (identity) =>
          ShellServices(mode: ShellMode.demo, session: identity),
    );
    final router = ShellRouterFactory(
      registry: registry,
      platform: AppPlatform.web,
      runtime: runtime,
      loader: loader,
      paths: ShellPages.paths,
      clock: clock.now,
    ).build(routes: ShellPages.routes(), shellBuilder: (_, _, child) => child);
    addTearDown(() {
      router.dispose();
      // Not awaited: closing the event bus waits for listeners that a widget
      // test never attaches, so awaiting it would hang the test.
      unawaited(runtime.dispose());
    });
    await tester.pumpWidget(TestApp(clock: clock.now).wrapRouter(router));
    router.go(location);
    await tester.pumpAndSettle();
    return router;
  }

  MicrofrontendScope _scopeFor(UserSession session) =>
      MicrofrontendScope(ShellServices(mode: ShellMode.demo, session: session));

  void _view(WidgetTester tester, Size size, double? textScale) {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    if (textScale != null) {
      tester.platformDispatcher.textScaleFactorTestValue = textScale;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    }
  }
}
