import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/audit_timeline.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

final _es = lookupBackofficeLocalizations(const Locale('es'));

void main() {
  Future<void> pumpTimeline(
    WidgetTester tester,
    List<AuditEntry> entries,
  ) async {
    tester.view.physicalSize = const Size(1280, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      TestApp(delegates: const [BackofficeLocalizations.delegate]).wrap(
        Scaffold(
          body: CustomScrollView(slivers: [AuditTimeline(entries: entries)]),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  group(AuditTimeline, () {
    testWidgets('an empty log shows the empty state', (tester) async {
      await pumpTimeline(tester, const []);

      expect(find.text(_es.auditEmpty), findsOneWidget);
    });

    testWidgets('shows actor, entity, trace and the reason in italics', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await pumpTimeline(tester, [
        AuditEntry(
          occurredAt: DateTime.utc(2026, 11, 10, 14, 5),
          actor: 'ana.torres',
          action: 'tenant.plan_changed',
          entity: 'tenant:t-001',
          traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
          detail: 'Starter a Enterprise',
        ),
        AuditEntry(
          occurredAt: DateTime.utc(2026, 9, 2, 10, 30),
          actor: 'sistema',
          action: 'tenant.created',
          entity: 'tenant:t-001',
          traceId: '9d1c4a2e7f0b4c3d8e6a5b4c3d2e1f0a',
        ),
      ]);

      expect(find.text(_es.auditActorLine('ana.torres')), findsOneWidget);
      expect(find.text(_es.auditEntityLine('tenant:t-001')), findsWidgets);
      expect(
        find.text(_es.traceIdLine('4bf92f3577b34da6a3ce929d0e0e4736')),
        findsOneWidget,
      );
      final reason = tester.widget<Text>(find.text('Starter a Enterprise'));
      expect(reason.style?.fontStyle, FontStyle.italic);
      await expectAccessible(tester);
      handle.dispose();
    });

    testWidgets('builds only the cards on screen of a long log', (
      tester,
    ) async {
      await pumpTimeline(tester, [
        for (var i = 0; i < 300; i++)
          AuditEntry(
            occurredAt: DateTime.utc(2026, 11, 10).add(Duration(minutes: i)),
            actor: 'operador-$i',
            action: 'saga.retryStep',
            entity: 'saga:s-$i',
            traceId: 'trace-$i',
          ),
      ]);

      expect(find.byType(AppCard).evaluate().length, lessThan(60));
    });
  });
}
