import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/screens/enum_filter.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart' show AppSpacing;

void main() {
  late List<TenantRegion?> changes;

  setUp(() => changes = []);

  Future<void> pumpFilter(
    WidgetTester tester, {
    TenantRegion? value,
    Size size = const Size(1280, 800),
  }) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await const TestApp().pump(
      tester,
      Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Align(
            alignment: AlignmentDirectional.topStart,
            child: EnumFilter<TenantRegion>(
              label: 'Región',
              allLabel: 'Todas',
              values: TenantRegion.values,
              valueLabel: (region) => 'región ${region.name}',
              value: value,
              onChanged: changes.add,
            ),
          ),
        ),
      ),
    );
  }

  group(EnumFilter, () {
    testWidgets('without a value shows the label and the all option', (
      tester,
    ) async {
      await pumpFilter(tester);

      expect(find.text('Región'), findsOneWidget);
      expect(find.text('Todas'), findsOneWidget);
    });

    testWidgets('shows the label of the selected value', (tester) async {
      await pumpFilter(tester, value: TenantRegion.usEast);

      expect(find.text('región usEast'), findsOneWidget);
      expect(find.text('Región'), findsOneWidget);
    });

    testWidgets('choosing an option reports it, and all reports null', (
      tester,
    ) async {
      await pumpFilter(tester);

      await tester.tap(find.byType(EnumFilter<TenantRegion>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('región saEast').last);
      await tester.pumpAndSettle();

      await tester.tap(find.byType(EnumFilter<TenantRegion>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Todas').last);
      await tester.pumpAndSettle();

      expect(changes, [TenantRegion.saEast, null]);
    });

    testWidgets('never grows wider than its maximum width', (tester) async {
      await pumpFilter(tester);

      expect(
        tester.getSize(find.byType(EnumFilter<TenantRegion>)).width,
        EnumFilter.maxWidth,
      );
    });

    testWidgets('is accessible at phone width', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpFilter(tester, size: const Size(320, 640));

      await expectAccessible(tester);
      handle.dispose();
    });
  });
}
