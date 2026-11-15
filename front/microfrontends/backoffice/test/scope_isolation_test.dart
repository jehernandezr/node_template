import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/backoffice_repository.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/backoffice_harness.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));

void main() {
  late BackofficeHarness harness;

  setUp(() => harness = BackofficeHarness());

  test('each scope gets its own repository and keeps its own writes', () async {
    final first = harness.newScope();
    final second = harness.newScope();

    BackofficeRepository create(ShellServices _) =>
        FakeBackofficeRepository(behavior: DemoBehavior());
    final repoFirst = first.get<BackofficeRepository>(create);
    final repoSecond = second.get<BackofficeRepository>(create);

    expect(identical(first.get<BackofficeRepository>(create), repoFirst), true);
    expect(identical(repoFirst, repoSecond), isFalse);

    await repoFirst.applySagaAction(
      sagaId: 's-102',
      action: SagaManualAction.markResolved,
      reason: 'Resuelto por soporte',
    );

    expect((await repoFirst.saga('s-102'))?.status, SagaStatus.completed);
    expect(
      (await repoSecond.saga('s-102'))?.status,
      SagaStatus.requiresIntervention,
    );
  });

  test(
    'closing the scope disposes its repository as a ScopedResource',
    () async {
      final scope = harness.newScope();
      final repository = FakeBackofficeRepository(behavior: DemoBehavior());
      scope.get<BackofficeRepository>((_) => repository);
      expect(repository.isDisposed, isFalse);

      await scope.dispose();

      expect(repository.isDisposed, isTrue);
      expect(
        () => scope.get<BackofficeRepository>(
          (_) => FakeBackofficeRepository(behavior: DemoBehavior()),
        ),
        throwsStateError,
      );
    },
  );

  testWidgets('a page built with a new scope does not see the previous one', (
    tester,
  ) async {
    final previous = harness.newScope();
    final resolved = FakeBackofficeRepository(behavior: DemoBehavior());
    previous.get<BackofficeRepository>((_) => resolved);
    await resolved.applySagaAction(
      sagaId: 's-102',
      action: SagaManualAction.markResolved,
      reason: 'Resuelto',
    );

    await harness.pump(
      tester,
      location: '/backoffice/sagas/s-102',
      scope: previous,
    );
    expect(find.text(_es.sagaStatusCompleted), findsOneWidget);

    await harness.pump(
      tester,
      location: '/backoffice/sagas/s-102',
      scope: harness.newScope(),
    );
    expect(find.text(_es.sagaStatusCompleted), findsNothing);
    expect(find.text(_es.sagaStatusRequiresIntervention), findsOneWidget);
  });
}
