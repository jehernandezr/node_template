import 'scaffold_exception.dart';

/// Replaces `{{name}}` placeholders in template text and in template paths.
final class TemplateRenderer {
  /// Creates the renderer. [values] maps a placeholder name to its text.
  const TemplateRenderer(this.values);

  static final RegExp _placeholder = RegExp(r'\{\{(\w+)\}\}');

  /// Placeholder name to value.
  final Map<String, String> values;

  /// [text] with every `{{name}}` replaced. Throws `ScaffoldException` for a
  /// placeholder that has no value, so a typo in a template never ships.
  String render(String text) => text.replaceAllMapped(_placeholder, (match) {
    final name = match.group(1)!;
    final value = values[name];
    if (value == null) {
      throw ScaffoldException('Marcador desconocido: {{$name}}');
    }
    return value;
  });
}
