import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

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
    expect(find.text('Código: IDENTITY.MFA.CODE_EXPIRED'), findsOneWidget);
    expect(find.text('ID de traza: trace-123'), findsOneWidget);
    expect(find.byType(AppButton), findsNothing);
  });

  testWidgets('retry button calls onRetry', (tester) async {
    var retries = 0;
    await pumpApp(
      tester,
      ErrorView(message: 'Failed.', onRetry: () => retries++),
    );
    await tester.tap(find.text('Reintentar'));
    expect(retries, 1);
  });

  testWidgets('omits code, trace and retry when not provided', (tester) async {
    await pumpApp(tester, const ErrorView(message: 'Failed.'));
    expect(find.byType(SelectionArea), findsNothing);
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
    expect(find.text('Código: X.CODE'), findsOneWidget);
    expect(find.text('ID de traza: trace-9'), findsOneWidget);
    expect(find.text('Reintentar'), findsOneWidget);
  });

  testWidgets('details shows message, code and trace id', (tester) async {
    await pumpApp(
      tester,
      ErrorView.details(
        const ErrorDetails(
          message: 'El código expiró.',
          code: 'IDENTITY.MFA.CODE_EXPIRED',
          traceId: 'trace-abc',
        ),
      ),
    );
    expect(find.text('El código expiró.'), findsOneWidget);
    expect(find.text('Código: IDENTITY.MFA.CODE_EXPIRED'), findsOneWidget);
    expect(find.text('ID de traza: trace-abc'), findsOneWidget);
  });

  testWidgets('the message is a live region', (tester) async {
    final handle = tester.ensureSemantics();
    await pumpApp(tester, const ErrorView(message: 'Failed.'));
    expect(
      tester.getSemantics(find.text('Failed.')),
      matchesSemantics(label: 'Failed.', isLiveRegion: true),
    );
    handle.dispose();
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
    expect(find.text('Código: PLATFORM.INTERNAL'), findsOneWidget);
    expect(find.text('ID de traza: trace-xyz'), findsOneWidget);
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
    expect(find.byType(SelectionArea), findsNothing);
  });

  testWidgets('default labels follow the app locale', (tester) async {
    await pumpApp(
      tester,
      ErrorView(
        message: 'Failed.',
        code: 'X.CODE',
        traceId: 'trace-1',
        onRetry: () {},
      ),
      locale: const Locale('en'),
    );

    final l10n = await AppLocalizations.delegate.load(const Locale('en'));
    expect(find.text(l10n.errorCodeLine('X.CODE')), findsOneWidget);
    expect(find.text(l10n.errorTraceIdLine('trace-1')), findsOneWidget);
    expect(find.text(l10n.actionRetry), findsOneWidget);
    expect(find.text('Reintentar'), findsNothing);
  });
}
