import 'scaffold_exception.dart';

/// Every spelling of the new microfrontend that the templates use.
///
/// The backslash goes first so the escapes added below are not doubled.
final class ScaffoldNames {
  /// Validates the input. Throws [ScaffoldException] when [id] is not one
  /// lowercase word (`^[a-z][a-z0-9]{1,23}$`), or when a label is blank, has
  /// a control character, or has `{` or `}` (ICU syntax in the ARB files).
  ScaffoldNames({
    required this.id,
    required this.menuLabelEs,
    required this.menuLabelEn,
  }) {
    if (!_idPattern.hasMatch(id)) {
      throw ScaffoldException(
        'The id "$id" must have 2 to 24 lowercase letters or digits and '
        'start with a letter.',
      );
    }
    _checkLabel('Spanish', menuLabelEs);
    _checkLabel('English', menuLabelEn);
  }

  static final RegExp _idPattern = RegExp(r'^[a-z][a-z0-9]{1,23}$');

  /// Id of the microfrontend and first segment of its routes: `reports`.
  final String id;

  /// Menu label in Spanish, as typed.
  final String menuLabelEs;

  /// Menu label in English, as typed.
  final String menuLabelEn;

  /// [id] with the first letter in uppercase: `Reports`.
  String get pascal => pascalOf(id);

  /// [text] with the first letter in uppercase; empty text stays empty. The
  /// CLI uses it for the default English label before [id] is validated.
  static String pascalOf(String text) =>
      text.isEmpty ? text : '${text[0].toUpperCase()}${text.substring(1)}';

  /// Placeholder name to value, for [TemplateRenderer]. Keys: `id`, `Pascal`,
  /// `menuEs` and `menuEn` (labels escaped for a Dart single-quoted string:
  /// `\\`, `'` and `$`), and `menuEsJson` and `menuEnJson` (labels escaped
  /// for a JSON string: `\\` and `"`).
  Map<String, String> get placeholders => {
    'id': id,
    'Pascal': pascal,
    'menuEs': _escapeDart(menuLabelEs),
    'menuEn': _escapeDart(menuLabelEn),
    'menuEsJson': _escapeJson(menuLabelEs),
    'menuEnJson': _escapeJson(menuLabelEn),
  };

  static void _checkLabel(String language, String label) {
    if (label.trim().isEmpty) {
      throw ScaffoldException('The $language label is empty.');
    }
    if (label.codeUnits.any((unit) => unit < 0x20 || unit == 0x7F)) {
      throw ScaffoldException('The $language label has a control character.');
    }
    if (label.contains('{') || label.contains('}')) {
      throw ScaffoldException('The $language label cannot contain braces.');
    }
  }

  static String _escapeDart(String text) => text
      .replaceAll(r'\', r'\\')
      .replaceAll("'", r"\'")
      .replaceAll(r'$', r'\$');

  static String _escapeJson(String text) =>
      text.replaceAll(r'\', r'\\').replaceAll('"', r'\"');
}
