import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/dlq_screen.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/backoffice_harness.dart';
import '../utils/gated_backoffice_repository.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));
final _en = lookupBackofficeLocalizations(const Locale('en'));
final _shared = lookupAppLocalizations(const Locale('es'));

const _queue = 'notifications-tasks-events';
const _queuePath = '/backoffice/dlq/notifications-tasks-events';

Finder get _redrive => find.byKey(const Key('dlq-redrive'));
Finder get _confirm => find.byKey(const Key('dlq-redrive-confirm'));

void main() {
  late BackofficeHarness harness;
  late DemoBehavior behavior;
  late FakeBackofficeRepository repo;
  late GatedBackofficeRepository gated;

  setUp(() {
    harness = BackofficeHarness();
    behavior = DemoBehavior(clock: harness.clock.now);
    repo = FakeBackofficeRepository(behavior: behavior);
    gated = GatedBackofficeRepository(repo);
  });

  group(DlqScreen, () {
    testWidgets('lists the queues and asks for a selection', (tester) async {
      await harness.pump(tester, location: '/backoffice/dlq', repository: repo);

      expect(find.text('notifications-tasks-events'), findsOneWidget);
      expect(find.text('reports-commands'), findsOneWidget);
      expect(find.text('billing-events'), findsOneWidget);
      expect(find.text(_es.dlqSelectQueue), findsOneWidget);
    });

    testWidgets('opening a queue lists its messages', (tester) async {
      final mounted = await harness.pump(
        tester,
        location: '/backoffice/dlq',
        repository: repo,
      );
      await tester.tap(
        find.byKey(const ValueKey('dlq-queue-notifications-tasks-events')),
      );
      await tester.pumpAndSettle();

      expect(mounted.location.path, _queuePath);
      expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
    });

    testWidgets('cancelling the redrive keeps the messages', (tester) async {
      await harness.pump(tester, location: _queuePath, repository: repo);

      await tester.tap(_redrive);
      await tester.pumpAndSettle();
      expect(find.text(_es.dlqRedriveConfirm(3, _queue)), findsOneWidget);

      await tester.tap(find.text(_shared.actionCancel));
      await tester.pumpAndSettle();

      expect(await repo.deadLetterMessages(_queue), hasLength(3));
    });

    testWidgets('confirming the redrive empties the queue', (tester) async {
      await harness.pump(tester, location: _queuePath, repository: repo);

      await tester.tap(_redrive);
      await tester.pumpAndSettle();
      await tester.tap(_confirm);
      await tester.pumpAndSettle();

      expect(find.text(_es.dlqRedriveDone(3)), findsOneWidget);
      expect(find.textContaining('SMTP timeout'), findsNothing);
    });

    testWidgets('an API error on redrive shows its message and keeps rows', (
      tester,
    ) async {
      behavior.failNext(
        ApiErrorException(
          ProblemDetails(
            type: 'about:blank',
            title: 'Conflict',
            status: 409,
            code: PlatformErrorCode.conflictVersionMismatch.code,
            traceId: 'trace-409',
          ),
        ),
        operation: BackofficeOperation.redrive,
      );
      await harness.pump(tester, location: _queuePath, repository: repo);

      await tester.tap(_redrive);
      await tester.pumpAndSettle();
      await tester.tap(_confirm);
      await tester.pumpAndSettle();

      final code = PlatformErrorCode.conflictVersionMismatch.code;
      expect(
        find.text('${errorMessage(_shared, code)} ($code)'),
        findsOneWidget,
      );
      expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
    });

    testWidgets('a network failure on redrive shows the fallback message', (
      tester,
    ) async {
      behavior.failNext(
        const FakeFailure(),
        operation: BackofficeOperation.redrive,
      );
      await harness.pump(tester, location: _queuePath, repository: repo);

      await tester.tap(_redrive);
      await tester.pumpAndSettle();
      await tester.tap(_confirm);
      await tester.pumpAndSettle();

      expect(find.text(_shared.errorFallback), findsOneWidget);
    });

    testWidgets('the redrive dialog is localized to English', (tester) async {
      await harness.pump(
        tester,
        location: _queuePath,
        repository: repo,
        locale: const Locale('en'),
      );

      await tester.tap(_redrive);
      await tester.pumpAndSettle();

      expect(find.text(_en.dlqRedriveTitle), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('a read-only session sees the messages but not redrive', (
      tester,
    ) async {
      await harness.pump(
        tester,
        location: _queuePath,
        repository: repo,
        session: harness.platformUser({PlatformRole.readOnly}),
      );

      expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
      expect(_redrive, findsNothing);
    });

    testWidgets('shows the loading view while the messages load', (
      tester,
    ) async {
      final gate = gated.holdNext(BackofficeOperation.deadLetterMessages);
      await harness.pump(
        tester,
        location: _queuePath,
        repository: gated,
        settle: false,
      );

      expect(find.byType(LoadingView), findsWidgets);

      gate.complete();
      await tester.pumpAndSettle();
      expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
    });

    testWidgets('an API error offers a retry that loads the queues', (
      tester,
    ) async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.deadLetterQueues,
      );
      await harness.pump(tester, location: '/backoffice/dlq', repository: repo);

      expect(
        find.text(_shared.errorCodeLine('PLATFORM.INTERNAL.UNEXPECTED')),
        findsOneWidget,
      );

      await tester.tap(find.text(_shared.actionRetry));
      await tester.pumpAndSettle();
      expect(find.text('billing-events'), findsOneWidget);
    });

    for (final (size, textScale) in [
      (const Size(320, 800), null),
      (const Size(1280, 1600), null),
      (const Size(320, 800), 2.0),
    ]) {
      testWidgets(
        'is accessible and fits at $size with text scale $textScale',
        (tester) async {
          await harness.pump(
            tester,
            location: _queuePath,
            repository: repo,
            size: size,
            textScale: textScale,
          );

          expect(tester.takeException(), isNull);
          await expectAccessible(tester);
        },
      );
    }
  });
}
