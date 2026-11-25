import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../utils/reports_test_app.dart';

Set<String> _keysOf(String path) =>
    (jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>).keys
        .where((key) => !key.startsWith('@'))
        .toSet();

void main() {
  test('es and en declare the same keys', () {
    expect(
      _keysOf('lib/src/l10n/app_en.arb'),
      _keysOf('lib/src/l10n/app_es.arb'),
    );
  });

  test('the Spanish strings come from ReportsLocalizations', () {
    expect(ReportsTestApp.es.catalogTitle, isNotEmpty);
    expect(ReportsTestApp.es.loadError, isNotEmpty);
  });

  test('the English strings come from ReportsLocalizations', () {
    expect(ReportsTestApp.en.catalogTitle, isNotEmpty);
    expect(ReportsTestApp.en.loadError, isNot(ReportsTestApp.es.loadError));
  });
}
