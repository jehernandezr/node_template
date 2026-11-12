import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:contracts/contracts.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

void main() {
  testWidgets('shows message, selectable code and trace id', (tester) async {
    await pumpApp(
      tester,
      const ErrorView(
        message: 'The code expired.',
        code: 'IDENTITY.MFA.CODE_EXPIRED',
        traceId: 'trace-123',
      ),
    );
    expect(find.text('The code expired.'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) =>
            w is SelectableText &&
            w.data == 'Código: IDENTITY.MFA.CODE_EXPIRED',
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (w) => w is SelectableText && w.data == 'ID de traza: trace-123',
      ),
      findsOneWidget,
    );
    expect(find.byType(AppButton), findsNothing);
  });

  testWidgets('retry button calls onRetry with the custom label', (
    tester,
  ) async {
    var retries = 0;
    await pumpApp(
      tester,
      ErrorView(
        message: 'Failed.',
        onRetry: () => retries++,
        retryLabel: 'Try again',
      ),
    );
    await tester.tap(find.text('Try again'));
    expect(retries, 1);
  });

  testWidgets('omits code, trace and retry when not provided', (tester) async {
    await pumpApp(tester, const ErrorView(message: 'Failed.'));
    expect(find.byType(SelectableText), findsNothing);
    expect(find.text('Reintentar'), findsNothing);
  });

  testWidgets('labels default to Spanish and the retry button shows', (
    tester,
  ) async {
    await pumpApp(
      tester,
      ErrorView(
        message: 'Failed.',
        code: 'X.CODE',
        traceId: 'trace-9',
        onRetry: () {},
      ),
    );
    expect(
      find.byWidgetPredicate(
        (w) => w is SelectableText && w.data == 'Código: X.CODE',
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (w) => w is SelectableText && w.data == 'ID de traza: trace-9',
      ),
      findsOneWidget,
    );
    expect(find.text('Reintentar'), findsOneWidget);
  });

  testWidgets('fromProblem shows code and trace id from the problem', (
    tester,
  ) async {
    const problem = ProblemDetails(
      type: 'about:blank',
      title: 'Expired',
      status: 400,
      code: 'IDENTITY.MFA.CODE_EXPIRED',
      traceId: 'trace-abc',
    );
    await pumpApp(
      tester,
      ErrorView.fromProblem(problem, message: 'El código expiró.'),
    );
    expect(find.text('El código expiró.'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) =>
            w is SelectableText &&
            w.data == 'Código: IDENTITY.MFA.CODE_EXPIRED',
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (w) => w is SelectableText && w.data == 'ID de traza: trace-abc',
      ),
      findsOneWidget,
    );
  });

  testWidgets('fromException uses the problem for ApiErrorException', (
    tester,
  ) async {
    const problem = ProblemDetails(
      type: 'about:blank',
      title: 'Boom',
      status: 500,
      code: 'PLATFORM.INTERNAL',
      traceId: 'trace-xyz',
    );
    await pumpApp(
      tester,
      ErrorView.fromException(
        const ApiErrorException(problem),
        fallbackMessage: 'No se pudo cargar.',
      ),
    );
    expect(find.text('No se pudo cargar.'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) => w is SelectableText && w.data == 'Código: PLATFORM.INTERNAL',
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (w) => w is SelectableText && w.data == 'ID de traza: trace-xyz',
      ),
      findsOneWidget,
    );
  });

  testWidgets('fromException shows only the fallback for other errors', (
    tester,
  ) async {
    await pumpApp(
      tester,
      ErrorView.fromException(
        StateError('boom'),
        fallbackMessage: 'No se pudo cargar.',
      ),
    );
    expect(find.text('No se pudo cargar.'), findsOneWidget);
    expect(find.byType(SelectableText), findsNothing);
  });
}
