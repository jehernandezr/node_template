import 'package:material_ui/material_ui.dart';
import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

const _problem = ProblemDetails(
  type: 'about:blank',
  title: 'Conflict',
  status: 409,
  code: 'TASKS.TASK.CONFLICT',
  traceId: 'trace-1',
);

Widget _view(AsyncValue<int> value, {VoidCallback? onRetry}) =>
    AsyncValueView<int>(
      value: value,
      errorMessage: 'No se pudo cargar',
      onRetry: onRetry,
      data: (count) => Text('total $count'),
    );

void main() {
  testWidgets('loading shows the loading view', (tester) async {
    await pumpApp(tester, _view(const AsyncValue.loading()));
    expect(find.byType(LoadingView), findsOneWidget);
  });

  testWidgets('data shows the builder', (tester) async {
    await pumpApp(tester, _view(const AsyncValue.data(3)));
    expect(find.text('total 3'), findsOneWidget);
  });

  testWidgets(
    'an API error shows the message, code and trace id, never the raw error',
    (tester) async {
      var retries = 0;
      await pumpApp(
        tester,
        _view(
          const AsyncValue.error(ApiErrorException(_problem)),
          onRetry: () => retries++,
        ),
      );
      expect(find.text('No se pudo cargar'), findsOneWidget);
      expect(find.textContaining('TASKS.TASK.CONFLICT'), findsOneWidget);
      expect(find.textContaining('trace-1'), findsOneWidget);
      expect(find.textContaining('Conflict'), findsNothing);

      await tester.tap(find.text('Reintentar'));
      expect(retries, 1);
    },
  );

  testWidgets('any other error shows only the localized message', (
    tester,
  ) async {
    await pumpApp(tester, _view(AsyncValue.error(StateError('socket'))));
    expect(find.text('No se pudo cargar'), findsOneWidget);
    expect(find.textContaining('socket'), findsNothing);
  });
}
