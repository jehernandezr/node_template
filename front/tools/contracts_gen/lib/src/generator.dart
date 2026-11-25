import 'package:dart_style/dart_style.dart';

import 'model.dart';
import 'naming.dart';

/// First line of every generated file.
const generatedHeader = '// GENERATED, do not edit.';

/// Barrel that exports all generated services, relative to `lib/src`.
const generatedBarrel = 'generated_contracts.dart';

/// Folders of each service.
enum Folder { enums, constants, types, schemas, http, messages }

String _fileName(String service, Folder folder) => switch (folder) {
  Folder.enums => '${snake(service)}_enums.dart',
  Folder.constants => '${snake(service)}_constants.dart',
  Folder.types => '${snake(service)}_types.dart',
  Folder.schemas => '${snake(service)}_schemas.dart',
  Folder.http => '${snake(service)}_routes.dart',
  Folder.messages => '${snake(service)}_messages.dart',
};

/// Path of a generated file, relative to `lib/src`.
String generatedPath(String service, Folder folder) =>
    '${snake(service)}/${folder.name}/${_fileName(service, folder)}';

/// Imports of a generated file (always two levels below `lib/src`).
final class _Imports {
  final Set<String> _paths = {};
  bool meta = false;

  void core() => _paths.add('../../core/core.dart');
  void of(String service, Folder folder) =>
      _paths.add('../../${generatedPath(service, folder)}');

  String render(String selfPath) {
    final lines = <String>[
      if (meta) "import 'package:meta/meta.dart';",
      if (meta) '',
      for (final path in (_paths.toList()..sort()))
        if (path != '../../$selfPath') "import '$path';",
    ];
    return lines.isEmpty ? '' : '${lines.join('\n')}\n\n';
  }
}

/// Generates the Dart files of all services.
/// Returns a map from path relative to `lib/src` to formatted content.
Map<String, String> generate(ContractModel model) {
  final files = <String, String>{};
  void emit(String path, String library, String body) {
    final source =
        '$generatedHeader\n'
        '// Source: backend/libs/contracts/*/export/contract.json.\n'
        '// Regenerate: cd front && dart run contracts_gen\n'
        '$library'
        '$body';
    files[path] = _format(source, path);
  }

  for (final service in model.services) {
    final enums = _enums(model, service);
    final constants = _constants(model, service);
    final types = _types(model, service);
    final schemas = _schemas(model, service);
    final http = _routes(model, service);
    final messages = _messages(model, service);
    final parts = {
      Folder.enums: enums,
      Folder.constants: constants,
      Folder.types: types,
      Folder.schemas: schemas,
      Folder.http: http,
      Folder.messages: messages,
    };
    final exports = <String>[];
    for (final entry in parts.entries) {
      final (imports, body) = entry.value;
      if (body.trim().isEmpty) continue;
      final path = generatedPath(service, entry.key);
      emit(path, '\n', '${imports.render(path)}$body');
      exports.add(
        "export '${entry.key.name}/${_fileName(service, entry.key)}';",
      );
    }
    emit(
      '${snake(service)}/${snake(service)}.dart',
      '\n/// Generated `$service` contract.\nlibrary;\n\n',
      '${exports.join('\n')}\n',
    );
  }
  emit(
    generatedBarrel,
    '\n/// All generated contracts.\nlibrary;\n\n',
    '${[for (final s in model.services) "export '${snake(s)}/${snake(s)}.dart';"].join('\n')}\n',
  );
  return files;
}

/// Path of `error_messages.dart`, relative to `packages/i18n/lib/src`.
const errorMessagesPath = 'generated/error_messages.dart';

/// Generates `errorMessageFor`: from each public error code to its ARB message.
///
/// Only codes with `public` audience are included; the
/// `AppLocalizations` getter is the catalog `messageKey`.
String generateErrorMessages(ContractModel model) {
  final cases = <String, String>{};
  for (final service in model.services) {
    for (final catalog in model.errorsOf(service).values) {
      for (final entry in (catalog as List<dynamic>).cast<Json>()) {
        if (entry['audience'] != 'public') continue;
        final code = entry['code'] as String;
        final key = entry['messageKey'] as String;
        if (!RegExp(r'^[a-z][A-Za-z0-9_]*$').hasMatch(key)) {
          throw GeneratorException('$service: invalid messageKey "$key"');
        }
        if (cases.containsKey(code)) {
          throw GeneratorException('$service: duplicate code $code');
        }
        cases[code] = key;
      }
    }
  }
  final out = StringBuffer()
    ..writeln(generatedHeader)
    ..writeln('// Source: backend/libs/contracts/*/export/contract.json.')
    ..writeln('// Regenerate: cd front && dart run contracts_gen')
    ..writeln()
    ..writeln('/// Messages for the public error codes of the contracts.')
    ..writeln('library;')
    ..writeln()
    ..writeln("import 'app_localizations.dart';")
    ..writeln()
    ..writeln('/// Localized message for a public error code [code].')
    ..writeln('///')
    ..writeln('/// An unknown code returns `errorFallback`.')
    ..writeln('String errorMessageFor(AppLocalizations l10n, String code) {')
    ..writeln('  return switch (code) {');
  for (final entry in cases.entries) {
    out.writeln('    ${dartString(entry.key)} => l10n.${entry.value},');
  }
  out
    ..writeln('    _ => l10n.errorFallback,')
    ..writeln('  };')
    ..writeln('}');
  return _format(out.toString(), errorMessagesPath);
}

final _formatter = DartFormatter(
  languageVersion: DartFormatter.latestLanguageVersion,
  pageWidth: 80,
);

String _format(String source, String path) {
  try {
    return _formatter.format(source, uri: path);
  } on FormatterException catch (error) {
    throw GeneratorException('Invalid Dart in $path: ${error.message()}');
  }
}

// ---------------------------------------------------------------------------
// Enums

(_Imports, String) _enums(ContractModel model, String service) {
  final out = StringBuffer();
  final schemas = model.schemasOf(service);
  final errors = model.errorsOf(service);

  for (final entry in model.enumsOf(service).entries) {
    final name = entry.key;
    final catalog = errors[name] as List<dynamic>?;
    if (catalog != null) {
      _errorEnum(out, service, name, catalog.cast<Json>());
      continue;
    }
    final values = [
      for (final v in (entry.value as Json)['values'] as List)
        (memberFromKey((v as Json)['name'] as String), v['value'] as String),
    ];
    final description = (schemas[name] as Json?)?['description'] as String?;
    _plainEnum(
      out,
      name,
      description ?? 'Enum `$name` of the `$service` contract.',
      values,
    );
  }
  for (final entry in model.schemaEnums[service]!.entries) {
    final description =
        (schemas[entry.key] as Json)['description'] as String? ??
        'Enum `${entry.key}` of the `$service` contract.';
    _plainEnum(out, entry.key, description, [
      for (final value in entry.value) (lowerCamel(value), value),
    ]);
  }
  return (_Imports(), out.toString());
}

void _plainEnum(
  StringBuffer out,
  String name,
  String description,
  List<(String, String)> values,
) {
  out
    ..write(docComment(description))
    ..writeln('///')
    ..writeln(
      '/// [tryParse] returns null for values this client does not know,',
    )
    ..writeln('/// so a new backend value is ignored instead of breaking.')
    ..writeln('enum $name {');
  for (final (member, value) in values) {
    out.writeln('  $member(${dartString(value)}),');
  }
  out
    ..writeln(';')
    ..writeln()
    ..writeln('  const $name(this.wireCode);')
    ..writeln()
    ..writeln('  /// Value used by the backend.')
    ..writeln('  final String wireCode;')
    ..writeln()
    ..writeln('  /// Value whose `wireCode` is [code], or null if unknown.')
    ..writeln('  static $name? tryParse(String code) {')
    ..writeln('    for (final value in values) {')
    ..writeln('      if (value.wireCode == code) return value;')
    ..writeln('    }')
    ..writeln('    return null;')
    ..writeln('  }')
    ..writeln('}')
    ..writeln();
}

void _errorEnum(
  StringBuffer out,
  String service,
  String name,
  List<Json> catalog,
) {
  final public = catalog.where((e) => e['audience'] == 'public').toList();
  if (public.isEmpty) return;
  out
    ..writeln('/// Public error codes of the `$service` contract.')
    ..writeln('///')
    ..writeln(
      '/// Only includes codes with `public` audience: internal ones never',
    )
    ..writeln(
      '/// reach the client. [messageKey] is the message key in the ARB.',
    )
    ..writeln('enum $name {');
  for (final entry in public) {
    out
      ..write(docComment(entry['description'] as String?, indent: '  '))
      ..writeln('  ${memberFromKey(entry['name'] as String)}(')
      ..writeln('    ${dartString(entry['code'] as String)},')
      ..writeln('    httpStatus: ${entry['httpStatus']},')
      ..writeln('    retryable: ${entry['retryable']},')
      ..writeln('    messageKey: ${dartString(entry['messageKey'] as String)},')
      ..writeln('  ),');
  }
  out
    ..writeln(';')
    ..writeln()
    ..writeln('  const $name(')
    ..writeln('    this.code, {')
    ..writeln('    required this.httpStatus,')
    ..writeln('    required this.retryable,')
    ..writeln('    required this.messageKey,')
    ..writeln('  });')
    ..writeln()
    ..writeln(
      '  /// Exact code sent by the backend, for example `${public.first['code']}`.',
    )
    ..writeln('  final String code;')
    ..writeln()
    ..writeln('  /// HTTP status the backend responds with.')
    ..writeln('  final int httpStatus;')
    ..writeln()
    ..writeln('  /// Whether the client may retry the same request.')
    ..writeln('  final bool retryable;')
    ..writeln()
    ..writeln('  /// ARB key of the human-readable message.')
    ..writeln('  final String messageKey;')
    ..writeln()
    ..writeln('  /// Same as [code].')
    ..writeln('  String get wireCode => code;')
    ..writeln()
    ..writeln(
      '  /// Value with [code], or null if this client does not know it.',
    )
    ..writeln('  static $name? fromCode(String code) {')
    ..writeln('    for (final value in values) {')
    ..writeln('      if (value.code == code) return value;')
    ..writeln('    }')
    ..writeln('    return null;')
    ..writeln('  }')
    ..writeln()
    ..writeln('  /// Same as [fromCode].')
    ..writeln('  static $name? tryParse(String code) => fromCode(code);')
    ..writeln('}')
    ..writeln();
}

// ---------------------------------------------------------------------------
// Constantes

(_Imports, String) _constants(ContractModel model, String service) {
  final out = StringBuffer();
  for (final entry in model.constantsOf(service).entries) {
    out
      ..writeln('/// `${entry.key}` constants of the `$service` contract.')
      ..writeln('abstract final class ${entry.key} {');
    for (final constant in (entry.value as Json).entries) {
      out.writeln(
        '  static const ${_constantType(constant.value)} '
        '${safeIdentifier(constant.key)} = ${_literal(constant.value)};',
      );
    }
    out
      ..writeln('}')
      ..writeln();
  }
  return (_Imports(), out.toString());
}

String _constantType(Object? value) => switch (value) {
  String() => 'String',
  int() => 'int',
  double() => 'double',
  bool() => 'bool',
  List() => 'List<${value.isEmpty ? 'Object' : _constantType(value.first)}>',
  _ => throw GeneratorException('unsupported constant $value'),
};

String _literal(Object? value) => switch (value) {
  String() => dartString(value),
  num() || bool() => '$value',
  List() => '[${value.map(_literal).join(', ')}]',
  _ => throw GeneratorException('unsupported constant $value'),
};

// ---------------------------------------------------------------------------
// Tipos

String _dartType(DType type) => switch (type) {
  DPrimitive(:final dart) => dart,
  DDateTime() => 'DateTime',
  DEnum(:final id) => id.name,
  DClass(:final id) => id.name,
  DList(:final item) => 'List<${_dartType(item)}>',
};

void _useType(_Imports imports, DType type, String service) {
  switch (type) {
    case DEnum(:final id):
      imports.of(id.service, Folder.enums);
    case DClass(:final id, :final core):
      if (core) {
        imports.core();
      } else if (id.service != service) {
        imports.of(id.service, Folder.types);
      }
    case DList(:final item):
      _useType(imports, item, service);
    case DPrimitive() || DDateTime():
      break;
  }
}

bool _identityEncode(DType type) => switch (type) {
  DPrimitive() => true,
  DList(:final item) => _identityEncode(item),
  _ => false,
};

String _decode(DType type, String raw, int depth) => switch (type) {
  DPrimitive(dart: 'String') => '$raw as String',
  DPrimitive(dart: 'bool') => '$raw as bool',
  DPrimitive(dart: 'int') => '($raw as num).toInt()',
  DPrimitive(dart: 'double') => '($raw as num).toDouble()',
  DPrimitive(:final dart) => throw GeneratorException(
    'unsupported primitive $dart',
  ),
  DDateTime() => 'DateTime.parse($raw as String)',
  DEnum(:final id) =>
    'decodeEnum($raw, ${id.name}.tryParse, ${dartString(id.name)})',
  DClass(:final id) => '${id.name}.fromJson($raw as Map<String, dynamic>)',
  DList(item: DEnum(:final id)) =>
    '[for (final e$depth in $raw as List<dynamic>) ?${id.name}.tryParse(e$depth as String)]',
  DList(:final item) =>
    '[for (final e$depth in $raw as List<dynamic>) ${_decode(item, 'e$depth', depth + 1)}]',
};

String _encode(DType type, String value, int depth) => switch (type) {
  DPrimitive() => value,
  DDateTime() => '$value.toUtc().toIso8601String()',
  DEnum() => '$value.wireCode',
  DClass() => '$value.toJson()',
  DList(:final item) when _identityEncode(item) => value,
  DList(:final item) =>
    '[for (final e$depth in $value) ${_encode(item, 'e$depth', depth + 1)}]',
};

String _fieldDecode(FieldSpec field) {
  final raw = "json[${dartString(field.json)}]";
  if (!field.optional) return _decode(field.type, raw, 0);
  return switch (field.type) {
    DPrimitive(dart: 'String') => '$raw as String?',
    DPrimitive(dart: 'bool') => '$raw as bool?',
    _ => '$raw == null ? null : ${_decode(field.type, raw, 0)}',
  };
}

String _fieldEncode(FieldSpec field) {
  final key = dartString(field.json);
  final name = field.dart;
  final identity = _identityEncode(field.type);
  if (!field.optional) return '$key: ${_encode(field.type, name, 0)}';
  if (!field.required) {
    return identity
        ? '$key: ?$name'
        : 'if ($name case final value?) $key: ${_encode(field.type, 'value', 0)}';
  }
  return identity
      ? '$key: $name'
      : '$key: switch ($name) { final value? => ${_encode(field.type, 'value', 0)}, null => null }';
}

(_Imports, String) _types(ContractModel model, String service) {
  final imports = _Imports();
  final out = StringBuffer();
  for (final spec in model.classes[service]!) {
    if (spec.core) continue;
    imports
      ..meta = true
      ..core();
    for (final field in spec.fields) {
      _useType(imports, field.type, service);
    }
    final name = spec.name;
    out
      ..write(
        docComment(
          spec.description ?? 'Object `$name` of the `$service` contract.',
        ),
      )
      ..writeln('@immutable')
      ..writeln('final class $name {');
    if (spec.fields.isEmpty) {
      out
        ..writeln('  const $name();')
        ..writeln()
        ..writeln('  /// Reads the object from JSON. It has no fields.')
        ..writeln(
          '  factory $name.fromJson(Map<String, dynamic> json) => const $name();',
        )
        ..writeln()
        ..writeln('  /// JSON of the object: always empty.')
        ..writeln('  Map<String, dynamic> toJson() => <String, dynamic>{};')
        ..writeln()
        ..writeln('  /// Same as [toJson], for use as a constant tear-off.')
        ..writeln(
          '  static Map<String, dynamic> encode($name value) => value.toJson();',
        )
        ..writeln()
        ..writeln('  @override')
        ..writeln('  bool operator ==(Object other) => other is $name;')
        ..writeln()
        ..writeln('  @override')
        ..writeln('  int get hashCode => contractHash(const []);')
        ..writeln('}')
        ..writeln();
      continue;
    }
    out.writeln('  const $name({');
    for (final field in spec.fields) {
      final required = field.required ? 'required ' : '';
      out.writeln('    ${required}this.${field.dart},');
    }
    out
      ..writeln('  });')
      ..writeln()
      ..writeln(
        '  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.',
      )
      ..writeln('  factory $name.fromJson(Map<String, dynamic> json) {')
      ..writeln('    try {')
      ..writeln('      return $name(');
    for (final field in spec.fields) {
      out.writeln('        ${field.dart}: ${_fieldDecode(field)},');
    }
    out
      ..writeln('      );')
      ..writeln('    } on TypeError catch (error) {')
      ..writeln("      throw FormatException('Invalid $name: \$error', json);")
      ..writeln('    }')
      ..writeln('  }')
      ..writeln();
    for (final field in spec.fields) {
      out
        ..write(docComment(field.description, indent: '  '))
        ..writeln(
          '  final ${_dartType(field.type)}${field.optional ? '?' : ''} ${field.dart};',
        )
        ..writeln();
    }
    out
      ..writeln('  /// JSON of the object; omits null optional fields.')
      ..writeln('  Map<String, dynamic> toJson() => <String, dynamic>{');
    for (final field in spec.fields) {
      out.writeln('    ${_fieldEncode(field)},');
    }
    out
      ..writeln('  };')
      ..writeln()
      ..writeln('  /// Same as [toJson], for use as a constant tear-off.')
      ..writeln(
        '  static Map<String, dynamic> encode($name value) => value.toJson();',
      )
      ..writeln()
      ..writeln('  @override')
      ..writeln('  bool operator ==(Object other) =>')
      ..writeln('      identical(this, other) ||')
      ..write('      other is $name');
    for (final field in spec.fields) {
      out.write(' && contractEquals(${field.dart}, other.${field.dart})');
    }
    out
      ..writeln(';')
      ..writeln()
      ..writeln('  @override')
      ..writeln(
        '  int get hashCode => contractHash([${spec.fields.map((f) => f.dart).join(', ')}]);',
      )
      ..writeln('}')
      ..writeln();
  }
  return (imports, out.toString());
}

// ---------------------------------------------------------------------------
// Validadores

/// Condition `length < min`, with `isEmpty` when the minimum is 1.
String _shorter(String value, int min) =>
    min == 1 ? '$value.isEmpty' : '$value.length < $min';

final class _Validators {
  _Validators(this.model, this.service, this.imports);

  /// Argument that propagates `acceptUnknownEnums` to nested objects.
  static const _lenient = 'acceptUnknownEnums: acceptUnknownEnums';

  final ContractModel model;
  final String service;
  final _Imports imports;
  final Map<String, String> patterns = {};
  final StringBuffer out = StringBuffer();
  var _counter = 0;

  String _code(String member) {
    imports.of('platform', Folder.enums);
    return 'PlatformErrorCode.$member.code';
  }

  void _add(String path, String member) =>
      out.writeln('addFieldError(errors, $path, ${_code(member)});');

  String _pattern(String source) =>
      patterns.putIfAbsent(source, () => '_pattern${patterns.length}');

  /// Writes the checks of `node` on the `value` variable.
  ///
  /// [arrayItem] indicates that `value` is a list element. There an unknown
  /// enum value is accepted when the validator runs with
  /// `acceptUnknownEnums` (what comes from the server), because `fromJson`
  /// discards those elements with `tryParse`. A standalone enum stays strict:
  /// the Dart enum has no way to represent the new value.
  void node(
    String from,
    Json node,
    String value,
    String path, {
    bool arrayItem = false,
  }) {
    final (inner, nullable) = ContractModel.unwrapNullable(node);
    if (nullable) {
      out.writeln('if ($value != null) {');
      this.node(from, inner, value, path, arrayItem: arrayItem);
      out.writeln('}');
      return;
    }
    final ref = inner[r'$ref'];
    if (ref is String) {
      final id = model.resolve(from, ref);
      final target = model.schema(id);
      if (ContractModel.isObject(target)) {
        if (id.service != service) imports.of(id.service, Folder.schemas);
        out.writeln(
          '${id.name}Schema.check($value, $path, errors, $_lenient);',
        );
      } else {
        this.node(id.service, target, value, path, arrayItem: arrayItem);
      }
      return;
    }
    final values =
        inner['enum'] ?? (inner.containsKey('const') ? [inner['const']] : null);
    if (values is List) {
      if (values.any((v) => v is! String)) {
        throw GeneratorException('$service: enum with non-string values');
      }
      final set = values.map((v) => dartString(v as String)).join(', ');
      final known = '!const <String>{$set}.contains($value)';
      out.writeln(
        'if ($value is! String || '
        '${arrayItem ? '(!acceptUnknownEnums && $known)' : known}) {',
      );
      _add(path, 'validationInvalidEnum');
      out.writeln('}');
      return;
    }
    switch (inner['type']) {
      case 'object':
        final spec = model.inlineClass(inner);
        if (spec == null) {
          throw GeneratorException(
            '$service: anonymous object without a class',
          );
        }
        out.writeln(
          '${spec.name}Schema.check($value, $path, errors, $_lenient);',
        );
      case 'string':
        out.writeln('if ($value is! String) {');
        _add(path, 'validationInvalidType');
        out.writeln('} else {');
        if (inner['minLength'] case final int min) {
          out.writeln('if (${_shorter(value, min)}) {');
          _add(path, 'validationTooShort');
          out.writeln('}');
        }
        if (inner['maxLength'] case final int max) {
          out.writeln('if ($value.length > $max) {');
          _add(path, 'validationTooLong');
          out.writeln('}');
        }
        final pattern = inner['pattern'] as String?;
        final format = inner['format'] as String?;
        if (pattern != null) {
          out.writeln('if (!${_pattern(pattern)}.hasMatch($value)) {');
          _add(path, 'validationInvalidFormat');
          out.writeln('}');
        } else if (format != null) {
          final check = switch (format) {
            'email' => '!emailPattern.hasMatch($value)',
            'uuid' => '!uuidPattern.hasMatch($value)',
            'date-time' => 'DateTime.tryParse($value) == null',
            _ => throw GeneratorException(
              '$service: unsupported format $format',
            ),
          };
          imports.core();
          out.writeln('if ($check) {');
          _add(path, 'validationInvalidFormat');
          out.writeln('}');
        }
        out.writeln('}');
      case 'integer' || 'number':
        final integer = inner['type'] == 'integer';
        out.writeln(
          'if ($value is! num || !$value.isFinite'
          '${integer ? ' || $value != $value.roundToDouble()' : ''}) {',
        );
        _add(path, 'validationInvalidType');
        out.writeln('} else {');
        for (final (keyword, op, member) in const [
          ('minimum', '<', 'validationTooSmall'),
          ('exclusiveMinimum', '<=', 'validationTooSmall'),
          ('maximum', '>', 'validationTooLarge'),
          ('exclusiveMaximum', '>=', 'validationTooLarge'),
        ]) {
          if (inner[keyword] case final num limit) {
            out.writeln('if ($value $op $limit) {');
            _add(path, member);
            out.writeln('}');
          }
        }
        out.writeln('}');
      case 'boolean':
        out.writeln('if ($value is! bool) {');
        _add(path, 'validationInvalidType');
        out.writeln('}');
      case 'array':
        out.writeln('if ($value is! List) {');
        _add(path, 'validationInvalidType');
        out.writeln('} else {');
        if (inner['minItems'] case final int min) {
          out.writeln('if (${_shorter(value, min)}) {');
          _add(path, 'validationTooShort');
          out.writeln('}');
        }
        if (inner['maxItems'] case final int max) {
          out.writeln('if ($value.length > $max) {');
          _add(path, 'validationTooLong');
          out.writeln('}');
        }
        final index = 'i${_counter++}';
        final item = 'item${_counter++}';
        out
          ..writeln('for (var $index = 0; $index < $value.length; $index++) {')
          ..writeln('final $item = $value[$index];');
        this.node(
          from,
          inner['items'] as Json,
          item,
          "joinPath($path, '\$$index')",
          arrayItem: true,
        );
        out.writeln('}');
        out.writeln('}');
      default:
        throw GeneratorException('$service: unsupported type ${inner['type']}');
    }
  }

  void check(ClassSpec spec) {
    final name = spec.name;
    out
      ..write(
        docComment(
          'Validator for [$name] generated from the contract JSON Schema.',
        ),
      )
      ..writeln('///')
      ..writeln('/// Returns the same codes and field paths as the server.')
      ..writeln('abstract final class ${name}Schema {')
      ..writeln(
        '  /// Errors in [json], or an empty list if it matches the contract.',
      )
      ..writeln(
        "  static List<FieldError> validate(Object? json, {String path = ''}) {",
      )
      ..writeln('    final errors = <FieldError>[];')
      ..writeln('    check(json, path, errors);')
      ..writeln('    return errors;')
      ..writeln('  }')
      ..writeln()
      ..writeln(
        '  /// Errors in [json] received from the server (response or message).',
      )
      ..writeln('  ///')
      ..writeln(
        '  /// Like [validate], but accepts enum values this client does not',
      )
      ..writeln('  /// know inside a list (for example a new permission):')
      ..writeln('  /// `fromJson` drops them instead of failing.')
      ..writeln(
        "  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {",
      )
      ..writeln('    final errors = <FieldError>[];')
      ..writeln('    check(json, path, errors, acceptUnknownEnums: true);')
      ..writeln('    return errors;')
      ..writeln('  }')
      ..writeln()
      ..writeln('  /// Adds the errors in [json] under [path] to [errors].')
      ..writeln('  ///')
      ..writeln('  /// With [acceptUnknownEnums], an unknown enum value inside')
      ..writeln('  /// a list is not an error.')
      ..writeln(
        '  static void check(Object? json, String path, List<FieldError> errors, {bool acceptUnknownEnums = false}) {',
      )
      ..writeln('    if (json is! Map<String, Object?>) {');
    _add('path', 'validationInvalidType');
    out
      ..writeln('      return;')
      ..writeln('    }');
    final properties = (spec.node['properties'] as Json?) ?? const {};
    final required = ((spec.node['required'] as List?) ?? const []).toSet();
    for (final entry in properties.entries) {
      final key = dartString(entry.key);
      final fieldPath = 'joinPath(path, $key)';
      final value = 'value${_counter++}';
      out
        ..writeln('if (json.containsKey($key)) {')
        ..writeln('final $value = json[$key];');
      node(spec.id.service, entry.value as Json, value, fieldPath);
      if (required.contains(entry.key)) {
        out.writeln('} else {');
        _add(fieldPath, 'validationRequired');
      }
      out.writeln('}');
    }
    if (spec.closed) {
      final keys = properties.keys.map(dartString).join(', ');
      out
        ..writeln('for (final key in json.keys) {')
        ..writeln('if (!const <String>{$keys}.contains(key)) {');
      _add('joinPath(path, key)', 'validationUnknownField');
      out
        ..writeln('}')
        ..writeln('}');
    }
    out
      ..writeln('  }')
      ..writeln('}')
      ..writeln();
    if (!spec.core) {
      imports.of(service, Folder.types);
      out
        ..writeln('/// Validation of [$name] against its contract.')
        ..writeln('extension ${name}Validation on $name {')
        ..writeln(
          '  /// Errors in this object, or an empty list if it matches the contract.',
        )
        ..writeln(
          '  List<FieldError> validate() => ${name}Schema.validate(toJson());',
        )
        ..writeln('}')
        ..writeln();
    }
  }
}

(_Imports, String) _schemas(ContractModel model, String service) {
  final imports = _Imports();
  final classes = model.classes[service]!;
  if (classes.isEmpty) return (imports, '');
  imports.core();
  final validators = _Validators(model, service, imports);
  for (final spec in classes) {
    validators.check(spec);
  }
  final patterns = StringBuffer();
  for (final entry in validators.patterns.entries) {
    patterns.writeln(
      'final ${entry.value} = RegExp(${dartString(entry.key)});',
    );
  }
  if (patterns.isNotEmpty) patterns.writeln();
  return (imports, '$patterns${validators.out}');
}

// ---------------------------------------------------------------------------
// Rutas

/// Generated class [ref] points to; adds its imports.
SchemaId _generatedClassOf(
  ContractModel model,
  String service,
  _Imports imports,
  Object? ref,
  String where,
) {
  if (ref is! Map<String, dynamic> || ref[r'$ref'] is! String) {
    throw GeneratorException('$service.$where: expected a \$ref');
  }
  final id = model.resolve(service, ref[r'$ref'] as String);
  if (!ContractModel.isObject(model.schema(id)) || coreClasses.contains(id)) {
    throw GeneratorException('$service.$where: $id is not a generated object');
  }
  imports
    ..of(id.service, Folder.types)
    ..of(id.service, Folder.schemas);
  return id;
}

/// Fields of `access` the generator understands.
const _accessKeys = {
  'kind',
  'permissions',
  'platformRoles',
  'features',
  'flags',
  'mfaMaxAgeMinutes',
};

/// Fields of `deprecated` the generator understands.
const _deprecationKeys = {'since', 'sunset', 'replacement'};

/// Values of the access enums declared in some contract, by name.
Map<String, Set<String>> _accessValues(ContractModel model) {
  final result = <String, Set<String>>{};
  for (final service in model.services) {
    for (final name in const [
      'Permission',
      'PlatformRole',
      'PlanFeature',
      'FeatureFlag',
    ]) {
      final declared = model.enumsOf(service)[name] as Json?;
      if (declared == null) continue;
      result.putIfAbsent(name, () => {}).addAll([
        for (final v in declared['values'] as List)
          (v as Json)['value'] as String,
      ]);
    }
  }
  return result;
}

void _checkKeys(String where, Json json, Set<String> known) {
  final unknown = json.keys.where((k) => !known.contains(k)).toList();
  if (unknown.isNotEmpty) {
    throw GeneratorException('$where: unknown fields $unknown');
  }
}

(_Imports, String) _routes(ContractModel model, String service) {
  final imports = _Imports();
  final routes = model.routesOf(service);
  if (routes.isEmpty) return (imports, '');
  imports
    ..core()
    ..of('platform', Folder.enums);
  final className = '${upperCamel(service)}Routes';
  final out = StringBuffer()
    ..writeln('/// Public HTTP routes of the `$service` contract.')
    ..writeln('abstract final class $className {');
  final accessValues = _accessValues(model);

  SchemaId classOf(Object? ref, String where) =>
      _generatedClassOf(model, service, imports, ref, where);

  for (final route in routes) {
    final name = route['name'] as String;
    final request = classOf(route['request'], name);
    final response = route['response'] == null
        ? null
        : classOf(route['response'], name);
    final access = route['access'] as Json;
    _checkKeys('$service.$name.access', access, _accessKeys);
    if (access['kind'] != 'public' && access['kind'] != 'authenticated') {
      throw GeneratorException(
        '$service.$name.access: unknown kind ${access['kind']}',
      );
    }
    for (final (key, enumName) in const [
      ('permissions', 'Permission'),
      ('platformRoles', 'PlatformRole'),
      ('features', 'PlanFeature'),
      ('flags', 'FeatureFlag'),
    ]) {
      final known = accessValues[enumName];
      for (final value in (access[key] as List?) ?? const []) {
        if (known == null || !known.contains(value)) {
          throw GeneratorException(
            '$service.$name.access.$key: $value is not in the enum $enumName',
          );
        }
      }
    }
    final mfaMaxAge = access['mfaMaxAgeMinutes'];
    final deprecated = route['deprecated'] as Json?;
    if (deprecated != null) {
      _checkKeys('$service.$name.deprecated', deprecated, _deprecationKeys);
    }
    String strings(Object? list) =>
        '<String>[${((list as List?) ?? const []).map((e) => dartString(e as String)).join(', ')}]';
    out
      ..write(docComment(route['description'] as String?, indent: '  '))
      ..writeln('  ///')
      ..writeln('  /// `${route['method']} ${route['path']}`')
      ..writeln(
        '  static const ${safeIdentifier(name)} = RouteDescriptor<${request.name}, ${response?.name ?? 'void'}>(',
      )
      ..writeln('    id: ${dartString(route['id'] as String)},')
      ..writeln(
        '    method: HttpMethod.${(route['method'] as String).toLowerCase()},',
      )
      ..writeln('    path: ${dartString(route['path'] as String)},')
      ..writeln('    version: ${route['version'] as int},')
      ..writeln('    pathParams: ${strings(route['pathParams'])},')
      ..writeln(
        '    requestLocation: RequestLocation.${route['requestLocation']},',
      )
      ..writeln('    successStatus: ${route['successStatus']},')
      ..writeln('    errors: ${strings(route['errors'])},')
      ..writeln('    requiresAuth: ${access['kind'] != 'public'},')
      ..writeln('    permissions: ${strings(access['permissions'])},')
      ..writeln('    platformRoles: ${strings(access['platformRoles'])},');
    if (access['features'] != null) {
      out.writeln('    features: ${strings(access['features'])},');
    }
    if (access['flags'] != null) {
      out.writeln('    flags: ${strings(access['flags'])},');
    }
    if (mfaMaxAge != null) {
      out.writeln('    mfaMaxAgeMinutes: ${mfaMaxAge as int},');
    }
    if (deprecated != null) {
      final replacement = deprecated['replacement'] as String?;
      out
        ..writeln('    deprecated: RouteDeprecation(')
        ..writeln('      since: ${dartString(deprecated['since'] as String)},')
        ..writeln(
          '      sunset: ${dartString(deprecated['sunset'] as String)},',
        );
      if (replacement != null) {
        out.writeln('      replacement: ${dartString(replacement)},');
      }
      out.writeln('    ),');
    }
    out
      ..writeln('    encodeRequest: ${request.name}.encode,')
      ..writeln('    validateRequest: ${request.name}Schema.validate,');
    if (response != null) {
      out
        ..writeln(
          '    validateResponse: ${response.name}Schema.validateIncoming,',
        )
        ..writeln('    decodeResponse: ${response.name}.fromJson,');
    }
    out
      ..writeln('  );')
      ..writeln();
  }
  out.writeln('}');
  return (imports, out.toString());
}

// ---------------------------------------------------------------------------
// Messages (events and commands)

(_Imports, String) _messages(ContractModel model, String service) {
  final imports = _Imports();
  final groups = [
    (
      'Events',
      'Events published by the `$service` contract.',
      model.eventsOf(service),
    ),
    (
      'Commands',
      'Commands handled by the `$service` contract.',
      model.commandsOf(service),
    ),
  ];
  if (groups.every((g) => g.$3.isEmpty)) return (imports, '');
  imports
    ..core()
    ..of('platform', Folder.enums);
  final out = StringBuffer();
  for (final (suffix, description, messages) in groups) {
    if (messages.isEmpty) continue;
    final className = '${upperCamel(service)}$suffix';
    out
      ..writeln('/// $description')
      ..writeln('abstract final class $className {');
    final names = <String>[];
    for (final message in messages) {
      final name = safeIdentifier(message['name'] as String);
      final kind = message['kind'] as String?;
      if (kind != 'event' && kind != 'command') {
        throw GeneratorException('$service.$name: unknown kind $kind');
      }
      final payload = _generatedClassOf(
        model,
        service,
        imports,
        message['payload'],
        name,
      );
      names.add(name);
      out
        ..write(docComment(message['description'] as String?, indent: '  '))
        ..writeln('  ///')
        ..writeln('  /// `${message['type']}`')
        ..writeln('  static const $name = MessageDescriptor<${payload.name}>(')
        ..writeln('    type: ${dartString(message['type'] as String)},')
        ..writeln('    kind: MessageKind.$kind,')
        ..writeln('    version: ${message['version'] as int},')
        ..writeln(
          '    validatePayload: ${payload.name}Schema.validateIncoming,',
        )
        ..writeln('    decodePayload: ${payload.name}.fromJson,')
        ..writeln('  );')
        ..writeln();
    }
    out
      ..writeln('  /// All descriptors, in contract order.')
      ..writeln(
        '  static const all = <MessageDescriptor<Object?>>[${names.join(', ')}];',
      )
      ..writeln()
      ..writeln(
        '  /// Descriptor with [type], or null if this client does not know it.',
      )
      ..writeln('  static MessageDescriptor<Object?>? byType(String type) {')
      ..writeln('    for (final message in all) {')
      ..writeln('      if (message.type == type) return message;')
      ..writeln('    }')
      ..writeln('    return null;')
      ..writeln('  }')
      ..writeln('}')
      ..writeln();
  }
  return (imports, out.toString());
}
