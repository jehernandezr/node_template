import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  late FakeClock clock;
  late DemoBehavior behavior;
  late FakeBackofficeRepository repo;

  setUp(() {
    clock = FakeClock();
    behavior = DemoBehavior(clock: clock.now);
    repo = FakeBackofficeRepository(behavior: behavior);
  });

  group(FakeBackofficeRepository, () {
    test('a failure scheduled for one operation spares the others', () async {
      behavior.failNext(
        const FakeFailure(),
        operation: BackofficeOperation.redrive,
      );

      expect(await repo.listTenants(), hasLength(5));
      await expectLater(
        repo.redrive('notifications-tasks-events'),
        throwsA(isA<FakeFailure>()),
      );
    });

    test('a failure without operation hits the next two calls only', () async {
      behavior.failNext(const FakeFailure(), count: 2);

      await expectLater(repo.overview(), throwsA(isA<FakeFailure>()));
      await expectLater(repo.listTenants(), throwsA(isA<FakeFailure>()));
      expect(await repo.overview(), isA<BackofficeOverview>());
    });

    testWidgets('a call waits the configured latency', (tester) async {
      const latency = Duration(milliseconds: 50);
      final timed = FakeBackofficeRepository(
        behavior: DemoBehavior(delay: latency, clock: clock.now),
      );
      var answered = false;
      unawaited(timed.overview().then((_) => answered = true));

      await tester.pump(latency - const Duration(milliseconds: 1));
      expect(answered, isFalse);

      await tester.pump(const Duration(milliseconds: 1));
      expect(answered, isTrue);
    });

    testWidgets('disposing during the latency ends the call with an error', (
      tester,
    ) async {
      const latency = Duration(milliseconds: 50);
      final timed = FakeBackofficeRepository(
        behavior: DemoBehavior(delay: latency, clock: clock.now),
      );
      final future = timed.overview();
      final expectation = expectLater(
        future,
        throwsA(isA<DemoDisposedException>()),
      );

      timed.dispose();
      await tester.pump(latency);
      await expectation;
    });

    test('after dispose the repository reports it and refuses calls', () async {
      repo.dispose();

      expect(repo.isDisposed, isTrue);
      await expectLater(repo.overview(), throwsA(isA<DemoDisposedException>()));
    });

    test(
      'a saga action is audited with the clock time and the reason',
      () async {
        clock.advance(const Duration(hours: 3));

        await repo.applySagaAction(
          sagaId: 's-102',
          action: SagaManualAction.markResolved,
          reason: 'ok',
        );

        final audit = await repo.sagaAudit('s-102');
        expect(audit.first.occurredAt, clock.now());
        expect(audit.first.detail, 'ok');
      },
    );

    test('a blank reason is rejected with a validation code', () async {
      await expectLater(
        repo.applySagaAction(
          sagaId: 's-102',
          action: SagaManualAction.retryStep,
          reason: '   ',
        ),
        throwsA(
          isA<ApiErrorException>().having(
            (e) => e.problem.code,
            'code',
            PlatformErrorCode.validationRequired.code,
          ),
        ),
      );
    });

    test('an unknown saga is reported as not found', () async {
      await expectLater(
        repo.applySagaAction(
          sagaId: 'no-existe',
          action: SagaManualAction.markResolved,
          reason: 'ok',
        ),
        throwsA(
          isA<ApiErrorException>().having(
            (e) => e.problem.code,
            'code',
            PlatformErrorCode.resourceNotFound.code,
          ),
        ),
      );
    });

    test('an unknown queue is reported as not found on redrive', () async {
      await expectLater(
        repo.redrive('no-existe'),
        throwsA(
          isA<ApiErrorException>().having(
            (e) => e.problem.code,
            'code',
            PlatformErrorCode.resourceNotFound.code,
          ),
        ),
      );
    });
  });
}
