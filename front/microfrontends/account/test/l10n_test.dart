import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'support/test_app.dart';

Set<String> _keys(String locale) => (jsonDecode(
  File('lib/src/l10n/app_$locale.arb').readAsStringSync(),
) as Map<String, dynamic>).keys.where((key) => !key.startsWith('@')).toSet();

void main() {
  test('es and en define the same keys', () {
    expect(_keys('en'), _keys('es'));
  });

  test('texts load in es and en', () async {
    final es = await loadEs();
    final en = await loadEn();
    expect(es.sessionsTitle, 'Sesiones activas');
    expect(en.sessionsTitle, isNot(es.sessionsTitle));
    expect(en.factorTotp, 'Authenticator app');
    expect(es.factorTotp, 'App de autenticación');
    expect(en.othersClosed(2), contains('2'));
  });
}
