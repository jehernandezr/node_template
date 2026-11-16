import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/screens/overview_controller.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_backoffice_repository.dart';

void main() {
  late FakeClock clock;
  late DemoBehavior behavior;
  late FakeBackofficeRepository fake;

  setUp(() {
    clock = FakeClock(DateTime.utc(2026, 11, 15, 12));
    behavior = DemoBehavior(clock: clock.now);
    fake = FakeBackofficeRepository(behavior: behavior);
  });

  group(OverviewController, () {
    test('starts in the loading state before any load', () {
      final controller = OverviewController(fake);
      addTearDown(controller.dispose);

      expect(controller.overview, isA<AsyncLoading<BackofficeOverview>>());
    });

    test('loads the tenant, intervention and dead-letter counts', () async {
      final controller = OverviewController(fake);
      addTearDown(controller.dispose);

      await controller.start();

      final overview =
          (controller.overview as AsyncData<BackofficeOverview>).value;
      expect(overview.tenantCount, 5);
      expect(overview.sagasNeedingIntervention, 2);
      expect(overview.deadLetterMessages, 15);
    });

    test('a failed load is an error and a second start recovers', () async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.overview,
      );
      final controller = OverviewController(fake);
      addTearDown(controller.dispose);

      await controller.start();
      final failed = controller.overview;
      expect(failed, isA<AsyncError<BackofficeOverview>>());
      expect(
        (failed as AsyncError<BackofficeOverview>).error,
        isA<ApiErrorException>(),
      );

      await controller.start();
      expect(controller.overview, isA<AsyncData<BackofficeOverview>>());
    });

    test(
      'disposing during a load stops notifications without throwing',
      () async {
        final gated = GatedBackofficeRepository(fake);
        final gate = gated.holdNext(BackofficeOperation.overview);
        final controller = OverviewController(gated);
        var notifications = 0;
        controller.addListener(() => notifications++);

        unawaited(controller.start());
        final beforeDispose = notifications;
        controller.dispose();
        gate.complete();
        await pumpEventQueue();

        expect(notifications, beforeDispose);
      },
    );
  });
}
