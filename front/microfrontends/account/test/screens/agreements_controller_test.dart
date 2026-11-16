import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/agreements_controller.dart';
import 'package:mf_account/src/shared/enums/account_enums.dart';
import 'package:mf_account/src/shared/types/account_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

/// Holds both agreement listings until the test completes them, and records
/// the order in which they were requested.
final class _GatedAgreementsRepository extends FakeAccountRepository {
  final Completer<List<Agreement>> pending = Completer();
  final Completer<List<Agreement>> accepted = Completer();
  final List<AccountOperation> requested = [];

  @override
  Future<List<Agreement>> listPendingAgreements() {
    requested.add(AccountOperation.listPendingAgreements);
    return pending.future;
  }

  @override
  Future<List<Agreement>> listAcceptedAgreements() {
    requested.add(AccountOperation.listAcceptedAgreements);
    return accepted.future;
  }
}

void main() {
  group(AgreementsController, () {
    test('loads the pending and the accepted agreements', () async {
      final controller = AgreementsController(FakeAccountRepository());
      addTearDown(controller.dispose);

      await controller.start();

      final overview = controller.agreements.valueOrNull!;
      expect(overview.pending, hasLength(2));
      expect(overview.accepted, hasLength(1));
    });

    test('a failed load is an error', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.listPendingAgreements,
        );
      final controller = AgreementsController(
        FakeAccountRepository(behavior: behavior),
      );
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.agreements, isA<AsyncError<AgreementsOverview>>());
    });

    test('a failed history load is an error too', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.listAcceptedAgreements,
        );
      final controller = AgreementsController(
        FakeAccountRepository(behavior: behavior),
      );
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.agreements, isA<AsyncError<AgreementsOverview>>());
    });

    test('both lists are requested before either one answers', () async {
      final repository = _GatedAgreementsRepository();
      final controller = AgreementsController(repository);
      addTearDown(controller.dispose);

      final loading = controller.start();
      await pumpEventQueue();

      expect(repository.pending.isCompleted, isFalse);
      expect(repository.requested, [
        AccountOperation.listPendingAgreements,
        AccountOperation.listAcceptedAgreements,
      ]);
      repository.pending.complete(const []);
      repository.accepted.complete(const []);
      await loading;
      expect(controller.agreements, isA<AsyncData<AgreementsOverview>>());
    });

    test('accepting moves the agreement to the history', () async {
      final controller = AgreementsController(FakeAccountRepository());
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.accept('ag-privacy');
      await pumpEventQueue();

      expect(result, isA<ActionSucceeded<void>>());
      final overview = controller.agreements.valueOrNull!;
      expect(overview.pending, hasLength(1));
      expect(overview.accepted, hasLength(2));
    });

    test('accepting an agreement that is not pending fails', () async {
      final controller = AgreementsController(FakeAccountRepository());
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.accept('no-existe');

      expect(result, isA<ActionFailed<void>>());
      expect(
        (result as ActionFailed<void>).error,
        isA<AgreementNotPendingException>(),
      );
    });

    test('the acceptance date comes from the demo clock', () async {
      final clock = FakeClock(DateTime.utc(2030, 5, 1));
      final controller = AgreementsController(
        FakeAccountRepository(behavior: DemoBehavior(clock: clock.now)),
      );
      addTearDown(controller.dispose);
      await controller.start();

      await controller.accept('ag-privacy');
      await pumpEventQueue();

      final accepted = controller.agreements.valueOrNull!.accepted;
      expect(accepted.first.acceptedAt, DateTime.utc(2030, 5, 1));
    });
  });
}
