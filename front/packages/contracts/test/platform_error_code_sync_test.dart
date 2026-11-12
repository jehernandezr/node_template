import 'dart:convert';
import 'dart:io';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

/// Keeps the Dart enum in step with the backend enum and the i18n messages.
/// Run from the package directory, which is where `flutter test` starts.
void main() {
  const tsPath =
      '../../../backend/libs/contracts/platform/src/lib/platform-error-code.ts';
  const arbEs = '../i18n/lib/l10n/app_es.arb';
  const arbEn = '../i18n/lib/l10n/app_en.arb';

  /// Same transformation the i18n package uses for message keys.
  String messageKeyFor(String code) =>
      'error_${code.toLowerCase().replaceAll('.', '_').replaceAll('-', '_')}';

  test('Dart codes equal the codes in the TypeScript enum', () {
    final source = File(tsPath).readAsStringSync();
    final tsCodes = RegExp(r"'(PLATFORM\.[A-Z_.]+)'")
        .allMatches(source)
        .map((match) => match.group(1)!)
        .toSet();

    final dartCodes = PlatformErrorCode.values
        .map((value) => value.code)
        .toSet();

    expect(tsCodes, isNotEmpty);
    expect(dartCodes, tsCodes);
  });

  test('every platform code has a message in app_es.arb and app_en.arb', () {
    final es =
        jsonDecode(File(arbEs).readAsStringSync()) as Map<String, dynamic>;
    final en =
        jsonDecode(File(arbEn).readAsStringSync()) as Map<String, dynamic>;

    for (final value in PlatformErrorCode.values) {
      final key = messageKeyFor(value.code);
      expect(es.containsKey(key), isTrue, reason: 'missing $key in app_es.arb');
      expect(en.containsKey(key), isTrue, reason: 'missing $key in app_en.arb');
    }
  });
}
