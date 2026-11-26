import 'dart:collection';

import 'naming.dart';

/// JSON as it comes out of `jsonDecode`.
typedef Json = Map<String, dynamic>;

/// Version of `contract.json` this generator understands.
const supportedFormatVersion = 2;

/// Generation error: the contract uses something the generator does not support.
class GeneratorException implements Exception {
  /// Failure of the generator with its [message].
  GeneratorException(this.message);

  /// What went wrong.
  final String message;

  @override
  String toString() => 'contracts_gen: $message';
}

/// Named schema within a service.
final class SchemaId {
  /// Schema [name] of [service].
  const SchemaId(this.service, this.name);

  /// Service that owns the schema.
  final String service;

  /// Name of the schema.
  final String name;

  @override
  bool operator ==(Object other) =>
      other is SchemaId && other.service == service && other.name == name;

  @override
  int get hashCode => Object.hash(service, name);

  @override
  String toString() => '$service.$name';
}

/// Dart type of a contract value.
sealed class DType {
  const DType();
}

/// `String`, `int`, `double` o `bool`.
final class DPrimitive extends DType {
  /// Primitive type written as [dart].
  const DPrimitive(this.dart);

  /// Dart name of the type.
  final String dart;
}

/// Text with `date-time` format, represented as `DateTime`.
final class DDateTime extends DType {
  /// Instant, written as `DateTime`.
  const DDateTime();
}

/// Enum generado.
final class DEnum extends DType {
  /// Enum of the schema [id].
  const DEnum(this.id);

  /// Schema of the enum.
  final SchemaId id;
}

/// Class generated or written by hand in `core`.
final class DClass extends DType {
  /// Class of the schema [id]; [core] when it lives in the hand-written core.
  const DClass(this.id, {this.core = false});

  /// Schema of the class.
  final SchemaId id;

  /// Whether the class lives in the core.
  final bool core;
}

/// List of another type.
final class DList extends DType {
  /// List of [item].
  const DList(this.item);

  /// Type of the items.
  final DType item;
}

/// Field of a generated class.
final class FieldSpec {
  /// Field of a generated class.
  FieldSpec({
    required this.json,
    required this.dart,
    required this.type,
    required this.node,
    required this.required,
    required this.nullable,
    this.description,
  });

  /// Name of the field in JSON.
  final String json;

  /// Name of the field in Dart.
  final String dart;

  /// Dart type of the field.
  final DType type;

  /// JSON schema node of the field.
  final Json node;

  /// Whether the field is required.
  final bool required;

  /// Whether the field accepts `null`.
  final bool nullable;

  /// Description of the field, if any.
  final String? description;

  /// The field can be null in Dart: it is optional or accepts null.
  bool get optional => !required || nullable;
}

/// Contract object generated as a class and as a validator.
final class ClassSpec {
  /// Generated class of a schema.
  ClassSpec({
    required this.id,
    required this.node,
    required this.core,
    this.description,
  });

  /// Schema of the class.
  final SchemaId id;

  /// JSON schema node of the class.
  final Json node;

  /// Whether the class lives in the core.
  final bool core;

  /// Description of the class, if any.
  final String? description;

  /// Fields of the class.
  final List<FieldSpec> fields = [];

  /// Whether the schema rejects unknown properties.
  bool get closed => node['additionalProperties'] == false;

  /// Dart name of the class.
  String get name => id.name;
}

/// Hand-written `core` classes: the generator does not emit them again.
final coreClasses = {
  SchemaId('platform', 'ProblemDetails'),
  SchemaId('platform', 'FieldError'),
};

/// Contracts loaded from `contract.json`, with reference resolution.
final class ContractModel {
  /// Model over the exported contract of each service, in service order.
  ContractModel(Map<String, Json> docs)
    : docs = SplayTreeMap.of(docs, _serviceOrder) {
    for (final entry in this.docs.entries) {
      final version = entry.value['formatVersion'];
      if (version != supportedFormatVersion) {
        throw GeneratorException(
          '${entry.key}: unsupported formatVersion $version '
          '(expected $supportedFormatVersion)',
        );
      }
      if (entry.value['service'] != entry.key) {
        throw GeneratorException(
          '${entry.key}: the service field does not match',
        );
      }
      if (entry.key == 'core') {
        throw GeneratorException('"core" is a reserved front name');
      }
    }
    _collect();
  }

  /// `platform` first; the rest in alphabetical order.
  static int _serviceOrder(String a, String b) {
    if (a == b) return 0;
    if (a == 'platform') return -1;
    if (b == 'platform') return 1;
    return a.compareTo(b);
  }

  /// Exported contracts by service.
  final SplayTreeMap<String, Json> docs;

  /// Classes per service, in order of appearance.
  final Map<String, List<ClassSpec>> classes = {};

  /// Schema enums without an entry in `enums`, per service.
  final Map<String, Map<String, List<String>>> schemaEnums = {};

  final Map<Json, ClassSpec> _inline = LinkedHashMap.identity();

  /// Names of the services.
  Iterable<String> get services => docs.keys;

  Json _section(String service, String key) =>
      (docs[service]?[key] as Map<String, dynamic>?) ?? const {};

  /// Enums of a service.
  Json enumsOf(String service) => _section(service, 'enums');

  /// Constants of a service.
  Json constantsOf(String service) => _section(service, 'constants');

  /// Schemas of a service.
  Json schemasOf(String service) => _section(service, 'schemas');

  /// Error codes of a service.
  Json errorsOf(String service) => _section(service, 'errors');

  /// HTTP routes of a service.
  List<Json> routesOf(String service) => _list(service, 'routes');

  /// Events of a service.
  List<Json> eventsOf(String service) => _list(service, 'events');

  /// Commands of a service.
  List<Json> commandsOf(String service) => _list(service, 'commands');

  List<Json> _list(String service, String key) =>
      ((docs[service]?[key] as List<dynamic>?) ?? const []).cast<Json>();

  /// Schema node of [id].
  Json schema(SchemaId id) {
    final schema = schemasOf(id.service)[id.name];
    if (schema is! Map<String, dynamic>) {
      throw GeneratorException('schema $id does not exist');
    }
    return schema;
  }

  static final _localRef = RegExp(r'^#/schemas/(\w+)$');
  static final _remoteRef = RegExp(
    r'^\.\./\.\./([a-z][a-z0-9-]*)/export/contract\.json#/schemas/(\w+)$',
  );

  /// Resolves a `$ref` seen from `from`.
  SchemaId resolve(String from, String ref) {
    final local = _localRef.firstMatch(ref);
    if (local != null) return SchemaId(from, local[1]!);
    final remote = _remoteRef.firstMatch(ref);
    if (remote != null) return SchemaId(remote[1]!, remote[2]!);
    throw GeneratorException('$from: unsupported reference $ref');
  }

  /// Splits `X | null` into (X, true).
  static (Json, bool) unwrapNullable(Json node) {
    final anyOf = node['anyOf'];
    if (anyOf is List && anyOf.length == 2) {
      final nulls = anyOf.where((n) => n is Map && n['type'] == 'null');
      final others = anyOf.where((n) => !(n is Map && n['type'] == 'null'));
      if (nulls.length == 1 && others.length == 1) {
        return (others.single as Json, true);
      }
    }
    final type = node['type'];
    if (type is List && type.length == 2 && type.contains('null')) {
      return ({...node, 'type': type.firstWhere((t) => t != 'null')}, true);
    }
    if (anyOf != null || node['oneOf'] != null || node['allOf'] != null) {
      throw GeneratorException('unsupported schema combinators: $node');
    }
    return (node, false);
  }

  /// Whether a schema node is an object.
  static bool isObject(Json node) => node['type'] == 'object';

  /// Whether a schema node is a string enum.
  static bool isStringEnum(Json node) =>
      node['type'] == 'string' && node['enum'] is List;

  /// Class assigned to an anonymous object inside another class.
  ClassSpec? inlineClass(Json node) => _inline[node];

  /// Anonymous objects are appended to the end of the list while it is traversed.
  void _collect() {
    for (final service in services) {
      final list = classes.putIfAbsent(service, () => []);
      final enums = enumsOf(service);
      schemaEnums[service] = {};
      for (final entry in schemasOf(service).entries) {
        final node = entry.value as Json;
        final id = SchemaId(service, entry.key);
        if (isObject(node)) {
          list.add(
            ClassSpec(
              id: id,
              node: node,
              core: coreClasses.contains(id),
              description: node['description'] as String?,
            ),
          );
        } else if (isStringEnum(node)) {
          final values = (node['enum'] as List).cast<String>();
          final declared = enums[entry.key] as Json?;
          if (declared == null) {
            schemaEnums[service]![entry.key] = values;
          } else {
            final declaredValues = [
              for (final v in declared['values'] as List) (v as Json)['value'],
            ];
            if (declaredValues.join('|') != values.join('|')) {
              throw GeneratorException(
                '$id: schema values do not match the enum',
              );
            }
          }
        }
      }
      for (var i = 0; i < list.length; i++) {
        _fields(list[i]);
      }
    }
    final names = <String, SchemaId>{};
    void claim(String name, SchemaId id) {
      final previous = names[name];
      if (previous != null && previous != id) {
        throw GeneratorException(
          'duplicate Dart name $name in $previous and $id',
        );
      }
      names[name] = id;
    }

    for (final service in services) {
      for (final spec in classes[service]!) {
        claim(spec.name, spec.id);
        claim('${spec.name}Schema', spec.id);
      }
      for (final name in enumsOf(service).keys) {
        claim(name, SchemaId(service, name));
      }
      for (final name in schemaEnums[service]!.keys) {
        claim(name, SchemaId(service, name));
      }
      for (final name in constantsOf(service).keys) {
        claim(name, SchemaId(service, name));
      }
      claim('${upperCamel(service)}Routes', SchemaId(service, 'routes'));
      claim('${upperCamel(service)}Events', SchemaId(service, 'events'));
      claim('${upperCamel(service)}Commands', SchemaId(service, 'commands'));
    }
  }

  void _fields(ClassSpec spec) {
    final properties = (spec.node['properties'] as Json?) ?? const {};
    final required = ((spec.node['required'] as List?) ?? const []).toSet();
    final allowed = {
      'type',
      'properties',
      'required',
      'additionalProperties',
      'description',
    };
    final extra = spec.node.keys.where((k) => !allowed.contains(k));
    if (extra.isNotEmpty) {
      throw GeneratorException('${spec.id}: unsupported keywords $extra');
    }
    final additional = spec.node['additionalProperties'];
    if (additional != null && additional != false) {
      throw GeneratorException('${spec.id}: unsupported additionalProperties');
    }
    for (final entry in properties.entries) {
      final node = entry.value as Json;
      final (inner, nullable) = unwrapNullable(node);
      spec.fields.add(
        FieldSpec(
          json: entry.key,
          dart: safeIdentifier(
            RegExp(r'^[a-z][A-Za-z0-9]*$').hasMatch(entry.key)
                ? entry.key
                : lowerCamel(entry.key),
          ),
          type: typeOf(spec, entry.key, inner),
          node: node,
          required: required.contains(entry.key),
          nullable: nullable,
          description: (node['description'] ?? inner['description']) as String?,
        ),
      );
    }
  }

  /// Dart type of `node`, property `prop` of `owner`. `node` is no longer nullable.
  DType typeOf(ClassSpec owner, String prop, Json node) {
    final ref = node[r'$ref'];
    if (ref is String) {
      final id = resolve(owner.id.service, ref);
      final target = schema(id);
      if (isObject(target)) return DClass(id, core: coreClasses.contains(id));
      if (isStringEnum(target)) return DEnum(id);
      final (inner, nullable) = unwrapNullable(target);
      if (nullable) {
        throw GeneratorException('$id: a named schema cannot be nullable');
      }
      return typeOf(
        ClassSpec(id: id, node: const {}, core: false),
        prop,
        inner,
      );
    }
    switch (node['type']) {
      case 'object':
        final spec = ClassSpec(
          id: SchemaId(owner.id.service, '${owner.name}${upperCamel(prop)}'),
          node: node,
          core: false,
          description: node['description'] as String?,
        );
        _inline[node] = spec;
        classes[owner.id.service]!.add(spec);
        return DClass(spec.id);
      case 'array':
        final items = node['items'];
        if (items is! Map<String, dynamic>) {
          throw GeneratorException('${owner.id}.$prop: array without items');
        }
        final (inner, nullable) = unwrapNullable(items);
        if (nullable) {
          throw GeneratorException(
            '${owner.id}.$prop: unsupported nullable items',
          );
        }
        return DList(typeOf(owner, '${prop}Item', inner));
      case 'string':
        return node['format'] == 'date-time'
            ? const DDateTime()
            : const DPrimitive('String');
      case 'integer':
        return const DPrimitive('int');
      case 'number':
        return const DPrimitive('double');
      case 'boolean':
        return const DPrimitive('bool');
      default:
        throw GeneratorException('${owner.id}.$prop: unsupported type $node');
    }
  }
}
