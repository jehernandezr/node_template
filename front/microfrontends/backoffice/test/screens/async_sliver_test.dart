import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:mf_backoffice/src/screens/async_sliver.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

final _shared = lookupAppLocalizations(const Locale('es'));

void main() {
  late int built;
  late int retries;

  setUp(() {
    built = 0;
    retries = 0;
  });

  Widget host(AsyncValue<int> value) =>
      TestApp(delegates: const [BackofficeLocalizations.delegate]).wrap(
        Scaffold(
          body: CustomScrollView(
            slivers: [
              AsyncSliver<int>(
                value: value,
                onRetry: () => retries++,
                data: (loaded) {
                  built++;
                  return [SliverToBoxAdapter(child: Text('valor $loaded'))];
                },
              ),
            ],
          ),
        ),
      );

  group(AsyncSliver, () {
    testWidgets('a loading value shows the loading view and builds no data', (
      tester,
    ) async {
      await tester.pumpWidget(host(const AsyncValue<int>.loading()));
      await tester.pump();

      expect(find.byType(LoadingView), findsOneWidget);
      expect(built, 0);
    });

    testWidgets('an error shows the message and its retry runs onRetry', (
      tester,
    ) async {
      await tester.pumpWidget(
        host(
          AsyncValue<int>.error(
            ApiErrorException(ProblemFixtures.unavailable()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text(_shared.errorCodeLine('PLATFORM.INTERNAL.UNEXPECTED')),
        findsOneWidget,
      );
      await tester.tap(find.text(_shared.actionRetry));
      await tester.pump();
      expect(retries, 1);
    });

    testWidgets('a loaded value shows its slivers', (tester) async {
      await tester.pumpWidget(host(const AsyncValue<int>.data(3)));
      await tester.pumpAndSettle();

      expect(find.text('valor 3'), findsOneWidget);
    });
  });
}
