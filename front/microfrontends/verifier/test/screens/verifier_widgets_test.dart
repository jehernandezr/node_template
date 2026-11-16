import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_verifier/src/l10n/generated/verifier_localizations.dart';
import 'package:mf_verifier/src/screens/verifier_state.dart';
import 'package:mf_verifier/src/screens/verifier_widgets.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/verifier_app.dart';

final VerifierLocalizations _es = VerifierTestApp.l10n('es');

/// The verifier widgets inside the shared test app, with their texts.
Widget _host(Widget child) =>
    TestApp(delegates: const [VerifierLocalizations.delegate])
        .wrap(Scaffold(body: child));

/// The challenge of the tests, at [secondsLeft] seconds.
VerifierChallenge _challenge(int secondsLeft) => VerifierChallenge(
  challenge: VerifierTestApp.loginChallenge,
  code: const AsyncData<String>('12345678'),
  secondsLeft: secondsLeft,
  copied: false,
);

void main() {
  group('widgets', () {
    testWidgets('the ready code is read digit by digit', (tester) async {
      final handle = tester.ensureSemantics();
      try {
        await tester.pumpWidget(
          _host(
            VerifierCodeCard(
              code: const AsyncData<String>('12345678'),
              copied: false,
              onCopy: () {},
            ),
          ),
        );
        await tester.pump();

        final node = tester.getSemantics(
          find.byWidgetPredicate(
            (widget) =>
                widget is Semantics &&
                widget.properties.value == '1 2 3 4 5 6 7 8',
          ),
        );
        expect(node.label, _es.codeTitle);
        expect(node.value, '1 2 3 4 5 6 7 8');
        expect(find.text('1234 5678'), findsOneWidget);
        expect(find.bySemanticsLabel('1234 5678'), findsNothing);
      } finally {
        handle.dispose();
      }
    });

    testWidgets('the countdown exposes its label', (tester) async {
      final handle = tester.ensureSemantics();
      try {
        await tester.pumpWidget(
          _host(const VerifierCountdown(secondsLeft: 150, totalSeconds: 150)),
        );
        await tester.pump();

        expect(find.bySemanticsLabel(_es.expiresIn('02:30')), findsOneWidget);
      } finally {
        handle.dispose();
      }
    });

    testWidgets('with disableAnimations the bar jumps', (tester) async {
      Widget app(int secondsLeft) =>
          TestApp(delegates: const [VerifierLocalizations.delegate]).wrap(
            Builder(
              builder: (context) => MediaQuery(
                data: MediaQuery.of(context).copyWith(disableAnimations: true),
                child: Scaffold(
                  body: VerifierCountdown(
                    secondsLeft: secondsLeft,
                    totalSeconds: 150,
                  ),
                ),
              ),
            ),
          );

      await tester.pumpWidget(app(150));
      await tester.pump();
      await tester.pumpWidget(app(75));
      await tester.pump();

      final bar = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(bar.value, 0.5);
    });

    testWidgets('VerifierAnnouncer announces once at 10 s and once on expiry', (
      tester,
    ) async {
      final messages = <String>[];
      Future<void> show(VerifierState state) async {
        await tester.pumpWidget(
          _host(
            VerifierAnnouncer(state: state, child: const SizedBox.shrink()),
          ),
        );
        await tester.pump();
        messages.addAll(tester.takeAnnouncements().map((a) => a.message));
      }

      for (final seconds in [12, 11, 10, 9, 8]) {
        await show(_challenge(seconds));
      }
      await show(const VerifierWaiting(expired: true));

      expect(messages, [
        _es.expiresSoonAnnouncement(10),
        _es.codeExpiredAnnouncement,
      ]);
    });
  });
}
