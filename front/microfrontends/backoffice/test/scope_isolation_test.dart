import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/backoffice_repository.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'support/harness.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));

void main() {
  setUp(resetDeferredPageCache);

  test('each scope gets its own repository and keeps its own writes', () async {
    final first = newScope();
    final second = newScope();

    BackofficeRepository create(ShellServices _) => FakeBackofficeRepository();
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
      final scope = newScope();
      final repository = FakeBackofficeRepository();
      scope.get<BackofficeRepository>((_) => repository);
      expect(repository.isDisposed, isFalse);

      await scope.dispose();

      expect(repository.isDisposed, isTrue);
      expect(
        () =>
            scope.get<BackofficeRepository>((_) => FakeBackofficeRepository()),
        throwsStateError,
      );
    },
  );

  testWidgets('a page built with a new scope does not see the previous one', (
    tester,
  ) async {
    final previous = newScope();
    final resolved = FakeBackofficeRepository();
    previous.get<BackofficeRepository>((_) => resolved);
    await resolved.applySagaAction(
      sagaId: 's-102',
      action: SagaManualAction.markResolved,
      reason: 'Resuelto',
    );

    await pumpBackoffice(
      tester,
      location: '/backoffice/sagas/s-102',
      scope: previous,
    );
    expect(find.text(_es.sagaStatusCompleted), findsOneWidget);

    await pumpBackoffice(
      tester,
      location: '/backoffice/sagas/s-102',
      scope: newScope(),
    );
    expect(find.text(_es.sagaStatusCompleted), findsNothing);
    expect(find.text(_es.sagaStatusRequiresIntervention), findsOneWidget);
  });
}
