import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/screens/sagas_controller.dart';
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

  group(SagasController, () {
    test('loads all sagas, most recently updated first', () async {
      final controller = SagasController(fake);
      addTearDown(controller.dispose);

      await controller.start();

      final sagas = (controller.sagas as AsyncData<List<Saga>>).value;
      expect(sagas.map((s) => s.id).toList(), [
        's-105',
        's-104',
        's-103',
        's-102',
        's-101',
      ]);
    });

    test('filterByStatus keeps only the sagas with that status', () async {
      final controller = SagasController(fake);
      addTearDown(controller.dispose);

      await controller.filterByStatus(SagaStatus.suspended);

      final sagas = (controller.sagas as AsyncData<List<Saga>>).value;
      expect(sagas.map((s) => s.id).toList(), ['s-103']);
      expect(controller.status, SagaStatus.suspended);
    });

    test(
      'an answer to an older filter does not replace the newer one',
      () async {
        final gated = GatedBackofficeRepository(fake);
        final controller = SagasController(gated);
        addTearDown(controller.dispose);
        await controller.start();

        final gate = gated.holdNext(BackofficeOperation.listSagas);
        unawaited(controller.filterByStatus(SagaStatus.running));
        await controller.filterByStatus(SagaStatus.suspended);
        gate.complete();
        await pumpEventQueue();

        final sagas = (controller.sagas as AsyncData<List<Saga>>).value;
        expect(sagas.map((s) => s.id).toList(), ['s-103']);
      },
    );

    test('a failed load is an error and start recovers', () async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.listSagas,
      );
      final controller = SagasController(fake);
      addTearDown(controller.dispose);

      await controller.start();
      expect(controller.sagas, isA<AsyncError<List<Saga>>>());

      await controller.start();
      expect(controller.sagas, isA<AsyncData<List<Saga>>>());
    });
  });
}
