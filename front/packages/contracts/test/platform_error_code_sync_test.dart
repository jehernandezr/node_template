import 'dart:convert';
import 'dart:io';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

/// Keeps the generated Dart in step with the exported contracts and the i18n
/// messages. Runs from the package directory, which is where `flutter test` starts.
void main() {
  const contractsDir = '../../../backend/libs/contracts';
  const arbEs = '../i18n/lib/l10n/app_es.arb';
  const arbEn = '../i18n/lib/l10n/app_en.arb';

  /// Same transformation the backend uses for `messageKey`.
  String messageKeyFor(String code) =>
      'error_${code.toLowerCase().replaceAll('.', '_').replaceAll('-', '_')}';

  /// Error catalog entries of every exported contract.
  List<Map<String, dynamic>> catalogEntries() {
    final entries = <Map<String, dynamic>>[];
    for (final dir in Directory(
      contractsDir,
    ).listSync().whereType<Directory>()) {
      final file = File('${dir.path}/export/contract.json');
      if (!file.existsSync()) continue;
      final doc = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      for (final catalog in (doc['errors'] as Map<String, dynamic>).values) {
        entries.addAll((catalog as List<dynamic>).cast<Map<String, dynamic>>());
      }
    }
    return entries;
  }

  final entries = catalogEntries();
  final publicEntries = entries
      .where((e) => e['audience'] == 'public')
      .toList();

  test('the exported catalogs have public codes', () {
    expect(publicEntries, isNotEmpty);
  });

  test(
    'PlatformErrorCode has exactly the public PLATFORM codes of the contract',
    () {
      final exported = publicEntries
          .map((e) => e['code'] as String)
          .where((code) => code.startsWith('PLATFORM.'))
          .toSet();
      final dart = PlatformErrorCode.values.map((value) => value.code).toSet();
      expect(dart, exported);
    },
  );

  test(
    'IdentityErrorCode has exactly the public IDENTITY codes of the contract',
    () {
      final exported = publicEntries
          .map((e) => e['code'] as String)
          .where((code) => code.startsWith('IDENTITY.'))
          .toSet();
      final dart = IdentityErrorCode.values.map((value) => value.code).toSet();
      expect(dart, exported);
    },
  );

  test('each messageKey is the ARB key of its code', () {
    for (final entry in entries) {
      expect(entry['messageKey'], messageKeyFor(entry['code'] as String));
    }
    for (final value in PlatformErrorCode.values) {
      expect(value.messageKey, messageKeyFor(value.code));
    }
  });

  test('every public code has a message in app_es.arb and app_en.arb', () {
    final es =
        jsonDecode(File(arbEs).readAsStringSync()) as Map<String, dynamic>;
    final en =
        jsonDecode(File(arbEn).readAsStringSync()) as Map<String, dynamic>;

    for (final entry in publicEntries) {
      final key = entry['messageKey'] as String;
      expect(es.containsKey(key), isTrue, reason: 'missing $key in app_es.arb');
      expect(en.containsKey(key), isTrue, reason: 'missing $key in app_en.arb');
    }
  });
}
