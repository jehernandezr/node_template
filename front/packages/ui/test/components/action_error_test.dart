import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

/// Pumps a button that runs [onTap] with its own context.
Future<void> _pumpButton(
  WidgetTester tester,
  void Function(BuildContext context) onTap,
) => pumpApp(
  tester,
  Builder(
    builder: (context) =>
        TextButton(onPressed: () => onTap(context), child: const Text('go')),
  ),
);

void main() {
  testWidgets('shows the given message', (tester) async {
    bool? shown;
    await _pumpButton(
      tester,
      (context) => shown = showActionError(
        context,
        StateError('raw'),
        message: 'No se pudo guardar',
      ),
    );
    await tester.tap(find.text('go'));
    await tester.pump();

    expect(shown, isTrue);
    expect(find.text('No se pudo guardar'), findsOneWidget);
    expect(find.textContaining('raw'), findsNothing);
  });

  testWidgets('an API error shows its detail and code', (tester) async {
    await _pumpButton(
      tester,
      (context) => showActionError(
        context,
        const ApiErrorException(
          ProblemDetails(
            type: 'about:blank',
            title: 'Conflict',
            detail: 'La tarea cambió',
            status: 409,
            code: 'TASKS.TASK.CONFLICT',
          ),
        ),
      ),
    );
    await tester.tap(find.text('go'));
    await tester.pump();

    expect(find.text('La tarea cambió (TASKS.TASK.CONFLICT)'), findsOneWidget);
  });

  testWidgets('an unknown error uses the default message', (tester) async {
    await _pumpButton(tester, (context) => showActionError(context, Object()));
    await tester.tap(find.text('go'));
    await tester.pump();
    expect(find.text(defaultActionErrorMessage), findsOneWidget);
  });

  testWidgets('does nothing once the context is unmounted', (tester) async {
    late BuildContext stale;
    await pumpApp(
      tester,
      Builder(
        builder: (context) {
          stale = context;
          return const SizedBox();
        },
      ),
    );
    await pumpApp(tester, const Text('otra pantalla'));

    final shown = showActionError(stale, StateError('late'), message: 'tarde');
    await tester.pump();
    expect(shown, isFalse);
    expect(find.byType(SnackBar), findsNothing);
  });

  testWidgets('replaces the snack bar that is showing', (tester) async {
    var count = 0;
    await _pumpButton(
      tester,
      (context) =>
          showActionError(context, Object(), message: 'error ${++count}'),
    );
    await tester.tap(find.text('go'));
    await tester.pump();
    await tester.tap(find.text('go'));
    await tester.pumpAndSettle();
    expect(find.text('error 2'), findsOneWidget);
    expect(find.text('error 1'), findsNothing);
  });
}
