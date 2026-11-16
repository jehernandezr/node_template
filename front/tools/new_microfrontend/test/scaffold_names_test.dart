import 'package:new_microfrontend/new_microfrontend.dart';
import 'package:test/test.dart';

ScaffoldNames _names({
  String id = 'reports',
  String es = 'Reportes',
  String en = 'Reports',
}) => ScaffoldNames(id: id, menuLabelEs: es, menuLabelEn: en);

void main() {
  test('accepts one lowercase word and derives its Pascal form', () {
    final names = _names();

    expect(names.id, 'reports');
    expect(names.pascal, 'Reports');
  });

  test('pascalOf capitalizes the first letter and keeps empty text', () {
    expect(ScaffoldNames.pascalOf('reports'), 'Reports');
    expect(ScaffoldNames.pascalOf(''), '');
  });

  test('refuses ids that are not one lowercase word', () {
    for (final id in ['Reports', 'my-reports', '', '1reports', 'r', 'a' * 25]) {
      expect(
        () => _names(id: id),
        throwsA(isA<ScaffoldException>()),
        reason: id,
      );
    }
  });

  test('refuses blank labels, braces and control characters', () {
    for (final label in ['', '   ', 'a{b', 'a}b', 'línea\nnueva']) {
      expect(
        () => _names(es: label),
        throwsA(isA<ScaffoldException>()),
        reason: label,
      );
      expect(
        () => _names(en: label),
        throwsA(isA<ScaffoldException>()),
        reason: label,
      );
    }
  });

  test('escapes the Spanish label for a Dart single-quoted string', () {
    expect(_names(es: "Rep'or\$tes").placeholders['menuEs'], r"Rep\'or\$tes");
  });

  test('doubles a backslash before the other escapes apply', () {
    expect(_names(es: r'a\b').placeholders['menuEs'], r'a\\b');
  });

  test('escapes double quotes for a JSON string', () {
    expect(_names(es: 'Di "hola"').placeholders['menuEsJson'], r'Di \"hola\"');
  });

  test('exposes every placeholder key', () {
    expect(_names().placeholders.keys, [
      'id',
      'Pascal',
      'menuEs',
      'menuEn',
      'menuEsJson',
      'menuEnJson',
    ]);
  });
}
