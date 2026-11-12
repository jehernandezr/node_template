import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/backoffice_models.dart';
import 'package:mf_backoffice/src/data/backoffice_repository.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  test('each identity scope gets its own repository and keeps its own writes', () async {
    final services = DefaultShellServices(
      session: UserSession.anonymous(),
      eventBus: ShellEventBus(),
    );
    final first = MicrofrontendScope(services);
    final second = MicrofrontendScope(services);

    BackofficeRepository create(ShellServices _) => FakeBackofficeRepository();
    final repoFirst = first.get<BackofficeRepository>(create);
    final repoSecond = second.get<BackofficeRepository>(create);

    // One instance per scope, and different instances across scopes.
    expect(identical(first.get<BackofficeRepository>(create), repoFirst), isTrue);
    expect(identical(repoFirst, repoSecond), isFalse);

    await repoFirst.applySagaAction(
      sagaId: 's-102',
      action: SagaManualAction.markResolved,
      reason: 'Resuelto por soporte',
    );

    expect((await repoFirst.saga('s-102'))?.status, SagaStatus.completed);
    expect((await repoSecond.saga('s-102'))?.status, SagaStatus.requiresIntervention);

    await first.dispose();
    expect(() => first.get<BackofficeRepository>(create), throwsStateError);
  });
}
