import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/screens/widgets/usage_meter.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';
import 'package:mf_billing/src/shared/types/billing_types.dart';
import 'package:ui/ui.dart';

import '../../utils/billing_test_app.dart';
import '../../utils/contrast_check.dart';

QuotaUsage _usage(int used, {int limit = 100}) => QuotaUsage(
  quota: Quota(key: UsageMetric.users, limit: limit),
  used: used,
);

Color _meterColor(WidgetTester tester) {
  final indicator = tester.widget<LinearProgressIndicator>(
    find.byType(LinearProgressIndicator),
  );
  return indicator.color!;
}

void main() {
  group(UsageMeter, () {
    testWidgets('meters keep text contrast at every level in both themes', (
      tester,
    ) async {
      await ContrastCheck.expectBothThemes(
        tester,
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final used in [10, 85, 100])
              SizedBox(width: 320, child: UsageMeter(usage: _usage(used))),
          ],
        ),
      );
    });

    testWidgets('usage meters switch color at 80% and 100%', (tester) async {
      Future<Color> colorAt(int used, int limit) async {
        await const BillingTestApp().pump(
          tester,
          UsageMeter(usage: _usage(used, limit: limit)),
        );
        return _meterColor(tester);
      }

      final scheme = AppTheme.light().colorScheme;
      final warning = AppTheme.light().extension<StatusColors>()!.warning;
      expect(await colorAt(79, 100), scheme.primary);
      expect(await colorAt(80, 100), warning);
      expect(await colorAt(99, 100), warning);
      expect(await colorAt(100, 100), scheme.error);
    });

    testWidgets('quota labels and counts follow the locale', (tester) async {
      await const BillingTestApp(locale: Locale('en')).pump(
        tester,
        UsageMeter(
          usage: QuotaUsage(
            quota: const Quota(key: UsageMetric.apiCalls, limit: 100000),
            used: 4200,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('API calls'), findsOneWidget);
      expect(find.text('4,200 / 100,000'), findsOneWidget);
    });

    testWidgets('meter bar is capped at full when over the limit', (
      tester,
    ) async {
      await const BillingTestApp().pump(
        tester,
        UsageMeter(usage: _usage(25, limit: 10)),
      );
      final indicator = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(indicator.value, 1.0);
      expect(find.text('25 / 10'), findsOneWidget);
    });
  });
}
