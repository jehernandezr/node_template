import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:i18n/i18n.dart';

/// Keys of an ARB file, without the `@@locale` and `@key` metadata entries.
Set<String> _messageKeys(String path) {
  final json = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
  return json.keys.where((key) => !key.startsWith('@')).toSet();
}

void main() {
  test('every ARB key exists in both languages', () {
    final es = _messageKeys('lib/l10n/app_es.arb');
    final en = _messageKeys('lib/l10n/app_en.arb');

    expect(es, isNotEmpty);
    expect(en.difference(es), isEmpty, reason: 'keys only in app_en.arb');
    expect(es.difference(en), isEmpty, reason: 'keys only in app_es.arb');
  });

  test('supportedLocales lists Spanish and English', () {
    expect(supportedLocales, containsAll(const [Locale('es'), Locale('en')]));
  });

  test('shell and shared keys exist in both languages with text', () {
    const keys = [
      'demoModeTitle',
      'demoModeHint',
      'demoSignInCustomer',
      'demoSignInCustomerNoAssistant',
      'demoSignInTenantAdmin',
      'demoSignInSuperAdmin',
      'forbiddenTitle',
      'forbiddenMessage',
      'goHome',
      'menuMore',
      'loading',
      'errorCodeLabel',
      'errorTraceIdLabel',
      'notFound',
      'confirm',
      'delete',
      'edit',
      'close',
      'back',
      'search',
      'loadMore',
      'emptyListTitle',
    ];
    final es = _messageKeys('lib/l10n/app_es.arb');
    final en = _messageKeys('lib/l10n/app_en.arb');
    final esJson = jsonDecode(File('lib/l10n/app_es.arb').readAsStringSync()) as Map<String, dynamic>;
    final enJson = jsonDecode(File('lib/l10n/app_en.arb').readAsStringSync()) as Map<String, dynamic>;

    for (final key in keys) {
      expect(es, contains(key), reason: 'missing in app_es.arb: $key');
      expect(en, contains(key), reason: 'missing in app_en.arb: $key');
      expect((esJson[key] as String).trim(), isNotEmpty, reason: 'empty es: $key');
      expect((enJson[key] as String).trim(), isNotEmpty, reason: 'empty en: $key');
    }
  });

  group('menuLabel', () {
    const menuKeys = {
      'menuAccount': 'Account',
      'menuTasks': 'Tasks',
      'menuNotifications': 'Notifications',
      'menuAssistant': 'Assistant',
      'menuBilling': 'Billing',
      'menuBackoffice': 'Administration',
      'menuVerifier': 'Verifier',
    };

    test('maps every menu key to its English label', () {
      final en = lookupAppLocalizations(const Locale('en'));
      menuKeys.forEach((key, label) {
        expect(menuLabel(en, key), label, reason: key);
      });
    });

    test('maps every menu key to its Spanish label', () {
      final es = lookupAppLocalizations(const Locale('es'));
      expect(menuLabel(es, 'menuAccount'), 'Cuenta');
      expect(menuLabel(es, 'menuBackoffice'), 'Administración');
    });

    test('returns the key itself for an unknown key', () {
      final en = lookupAppLocalizations(const Locale('en'));
      expect(menuLabel(en, 'menuUnknown'), 'menuUnknown');
      expect(menuLabel(en, ''), '');
    });
  });

  group('errorMessage', () {
    test('returns the Spanish message for a known code', () {
      final l10n = lookupAppLocalizations(const Locale('es'));
      expect(
        errorMessage(l10n, 'PLATFORM.AUTH.FORBIDDEN'),
        'No tienes permiso para realizar esta acción.',
      );
    });

    test('returns the English message for a known code', () {
      final l10n = lookupAppLocalizations(const Locale('en'));
      expect(
        errorMessage(l10n, 'PLATFORM.RATE_LIMIT.EXCEEDED'),
        'Too many requests. Wait a moment and try again.',
      );
    });

    test('falls back to the generic message for unknown codes', () {
      final es = lookupAppLocalizations(const Locale('es'));
      final en = lookupAppLocalizations(const Locale('en'));
      expect(errorMessage(es, 'TASKS.ITEM.LOCKED'), es.errorFallback);
      expect(errorMessage(en, ''), en.errorFallback);
    });
  });
}
