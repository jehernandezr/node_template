/// Conversion of contract names to Dart identifiers.
library;

const _reserved = {
  // Dart reserved words.
  'assert', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'default', 'do', 'else', 'enum', 'extends', 'false', 'final', 'finally',
  'for', 'if', 'in', 'is', 'new', 'null', 'rethrow', 'return', 'super',
  'switch', 'this', 'throw', 'true', 'try', 'var', 'void', 'while', 'with',
  'yield',
  // Object members a field cannot take.
  'hashCode', 'runtimeType', 'toString', 'noSuchMethod',
};

/// Enum members a value cannot take.
const _enumMembers = {'values', 'index', 'name'};

/// Splits a text into words: `tasks:read` → [tasks, read], `SignIn` → [Sign, In].
List<String> words(String input) {
  final spaced = input
      .replaceAllMapped(RegExp(r'([a-z0-9])([A-Z])'), (m) => '${m[1]} ${m[2]}')
      .replaceAll(RegExp(r'[^A-Za-z0-9]+'), ' ')
      .trim();
  return spaced.isEmpty ? const [] : spaced.split(' ');
}

String _capitalize(String word) => word.isEmpty
    ? word
    : word[0].toUpperCase() + word.substring(1).toLowerCase();

/// `SignInRequest` o `sign-in` → `signInRequest`, evitando palabras reservadas.
String lowerCamel(String input) {
  final parts = words(input);
  if (parts.isEmpty) throw ArgumentError('Empty name: "$input"');
  final result =
      parts.first.toLowerCase() + parts.skip(1).map(_capitalize).join();
  return safeIdentifier(result);
}

/// `sign_in` o `nested` → `SignIn`, `Nested`.
String upperCamel(String input) {
  final parts = words(input);
  if (parts.isEmpty) throw ArgumentError('Empty name: "$input"');
  return parts.map((w) => w[0].toUpperCase() + w.substring(1)).join();
}

/// Enum member name from the TypeScript key: `TasksRead` → `tasksRead`.
String memberFromKey(String key) {
  if (RegExp(r'^[A-Z][A-Za-z0-9]*$').hasMatch(key)) {
    return safeIdentifier(
      key[0].toLowerCase() + key.substring(1),
      enumMember: true,
    );
  }
  return safeIdentifier(lowerCamel(key), enumMember: true);
}

/// Appends `Value` if the name clashes with a reserved word or an Enum member.
String safeIdentifier(String name, {bool enumMember = false}) {
  var result = name;
  if (RegExp(r'^[0-9]').hasMatch(result)) result = 'v$result';
  final clash =
      _reserved.contains(result) ||
      (enumMember && _enumMembers.contains(result));
  return clash ? '${result}Value' : result;
}

/// Dart file name: `identity` → `identity`, `file-storage` → `file_storage`.
String snake(String input) =>
    words(input).map((w) => w.toLowerCase()).join('_');

/// Dart string literal with single quotes and the necessary escapes.
String dartString(String value) {
  final escaped = value
      .replaceAll(r'\', r'\\')
      .replaceAll("'", r"\'")
      .replaceAll(r'$', r'\$')
      .replaceAll('\n', r'\n')
      .replaceAll('\r', r'\r');
  return "'$escaped'";
}

/// Dart documentation comment from free text.
String docComment(String? text, {String indent = ''}) {
  if (text == null || text.trim().isEmpty) return '';
  final lines = text
      .trim()
      .split('\n')
      .map((line) => '$indent/// ${line.trim()}'.trimRight())
      .join('\n');
  return '$lines\n';
}
