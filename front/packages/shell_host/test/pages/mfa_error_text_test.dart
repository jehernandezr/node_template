import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_host/src/pages/mfa_error_text.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('es'));
  const key = ValueKey('error');

  group('MfaErrorText', () {
    testWidgets('without a code draws nothing', (tester) async {
      await tester.pumpWidget(
        TestApp().wrap(
          const Scaffold(body: MfaErrorText(textKey: key, code: null)),
        ),
      );

      expect(find.byKey(key), findsNothing);
    });

    testWidgets('a code draws its message as a live region', (tester) async {
      final code = IdentityErrorCode.authInvalidCredentials.code;
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(
        TestApp().wrap(
          Scaffold(
            body: MfaErrorText(textKey: key, code: code),
          ),
        ),
      );

      expect(find.text(errorMessage(l10n, code)), findsOneWidget);
      expect(
        tester.getSemantics(find.byKey(key)),
        isSemantics(isLiveRegion: true),
      );
      await expectAccessible(tester);
      handle.dispose();
    });
  });
}
