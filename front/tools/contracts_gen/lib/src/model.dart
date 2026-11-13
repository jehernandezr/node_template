import 'dart:collection';

import 'naming.dart';

/// JSON tal como sale de `jsonDecode`.
typedef Json = Map<String, dynamic>;

/// Versión de `contract.json` que entiende este generador.
const supportedFormatVersion = 2;

/// Error de generación: el contrato usa algo que el generador no soporta.
class GeneratorException implements Exception {
  GeneratorException(this.message);

  final String message;

  @override
  String toString() => 'contracts_gen: $message';
}

/// Esquema con nombre dentro de un servicio.
final class SchemaId {
  const SchemaId(this.service, this.name);

  final String service;
  final String name;

  @override
  bool operator ==(Object other) =>
      other is SchemaId && other.service == service && other.name == name;

  @override
  int get hashCode => Object.hash(service, name);

  @override
  String toString() => '$service.$name';
}

/// Tipo Dart de un valor del contrato.
sealed class DType {
  const DType();
}

/// `String`, `int`, `double` o `bool`.
final class DPrimitive extends DType {
  const DPrimitive(this.dart);
  final String dart;
}

/// Texto con formato `date-time`, representado como `DateTime`.
final class DDateTime extends DType {
  const DDateTime();
}

/// Enum generado.
final class DEnum extends DType {
  const DEnum(this.id);
  final SchemaId id;
}

/// Clase generada o escrita a mano en `core`.
final class DClass extends DType {
  const DClass(this.id, {this.core = false});
  final SchemaId id;
  final bool core;
}

/// Lista de otro tipo.
final class DList extends DType {
  const DList(this.item);
  final DType item;
}

/// Campo de una clase generada.
final class FieldSpec {
  FieldSpec({
    required this.json,
    required this.dart,
    required this.type,
    required this.node,
    required this.required,
    required this.nullable,
    this.description,
  });

  final String json;
  final String dart;
  final DType type;
  final Json node;
  final bool required;
  final bool nullable;
  final String? description;

  /// El campo puede ser null en Dart: es opcional o acepta null.
  bool get optional => !required || nullable;
}

/// Objeto del contrato que se genera como clase y como validador.
final class ClassSpec {
  ClassSpec({
    required this.id,
    required this.node,
    required this.core,
    this.description,
  });

  final SchemaId id;
  final Json node;
  final bool core;
  final String? description;
  final List<FieldSpec> fields = [];

  bool get closed => node['additionalProperties'] == false;
  String get name => id.name;
}

/// Clases de `core` escritas a mano: el generador no las vuelve a emitir.
final coreClasses = {
  SchemaId('platform', 'ProblemDetails'),
  SchemaId('platform', 'FieldError'),
};

/// Contratos cargados de `contract.json`, con resolución de referencias.
final class ContractModel {
  ContractModel(Map<String, Json> docs)
    : docs = SplayTreeMap.of(docs, _serviceOrder) {
    for (final entry in this.docs.entries) {
      final version = entry.value['formatVersion'];
      if (version != supportedFormatVersion) {
        throw GeneratorException(
          '${entry.key}: formatVersion $version no soportado '
          '(se espera $supportedFormatVersion)',
        );
      }
      if (entry.value['service'] != entry.key) {
        throw GeneratorException('${entry.key}: el campo service no coincide');
      }
      if (entry.key == 'core') {
        throw GeneratorException('"core" es un nombre reservado del front');
      }
    }
    _collect();
  }

  /// `platform` primero; el resto en orden alfabético.
  static int _serviceOrder(String a, String b) {
    if (a == b) return 0;
    if (a == 'platform') return -1;
    if (b == 'platform') return 1;
    return a.compareTo(b);
  }

  final SplayTreeMap<String, Json> docs;

  /// Clases por servicio, en orden de aparición.
  final Map<String, List<ClassSpec>> classes = {};

  /// Enums de esquema sin entrada en `enums`, por servicio.
  final Map<String, Map<String, List<String>>> schemaEnums = {};

  final Map<Json, ClassSpec> _inline = LinkedHashMap.identity();

  Iterable<String> get services => docs.keys;

  Json _section(String service, String key) =>
      (docs[service]?[key] as Map<String, dynamic>?) ?? const {};

  Json enumsOf(String service) => _section(service, 'enums');
  Json constantsOf(String service) => _section(service, 'constants');
  Json schemasOf(String service) => _section(service, 'schemas');
  Json errorsOf(String service) => _section(service, 'errors');
  List<Json> routesOf(String service) => _list(service, 'routes');
  List<Json> eventsOf(String service) => _list(service, 'events');
  List<Json> commandsOf(String service) => _list(service, 'commands');

  List<Json> _list(String service, String key) =>
      ((docs[service]?[key] as List<dynamic>?) ?? const []).cast<Json>();

  Json schema(SchemaId id) {
    final schema = schemasOf(id.service)[id.name];
    if (schema is! Map<String, dynamic>) {
      throw GeneratorException('no existe el esquema $id');
    }
    return schema;
  }

  static final _localRef = RegExp(r'^#/schemas/(\w+)$');
  static final _remoteRef = RegExp(
    r'^\.\./\.\./([a-z][a-z0-9-]*)/export/contract\.json#/schemas/(\w+)$',
  );

  /// Resuelve un `$ref` visto desde `from`.
  SchemaId resolve(String from, String ref) {
    final local = _localRef.firstMatch(ref);
    if (local != null) return SchemaId(from, local[1]!);
    final remote = _remoteRef.firstMatch(ref);
    if (remote != null) return SchemaId(remote[1]!, remote[2]!);
    throw GeneratorException('$from: referencia no soportada $ref');
  }

  /// Separa `X | null` en (X, true).
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
      throw GeneratorException(
        'combinaciones de esquemas no soportadas: $node',
      );
    }
    return (node, false);
  }

  static bool isObject(Json node) => node['type'] == 'object';

  static bool isStringEnum(Json node) =>
      node['type'] == 'string' && node['enum'] is List;

  /// Clase asignada a un objeto anónimo dentro de otra clase.
  ClassSpec? inlineClass(Json node) => _inline[node];

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
                '$id: los valores del esquema no coinciden con el enum',
              );
            }
          }
        }
      }
      // Los objetos anónimos se agregan al final de la lista mientras se recorre.
      for (var i = 0; i < list.length; i++) {
        _fields(list[i]);
      }
    }
    final names = <String, SchemaId>{};
    void claim(String name, SchemaId id) {
      final previous = names[name];
      if (previous != null && previous != id) {
        throw GeneratorException(
          'nombre Dart repetido $name en $previous y $id',
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
      throw GeneratorException(
        '${spec.id}: palabras clave no soportadas $extra',
      );
    }
    final additional = spec.node['additionalProperties'];
    if (additional != null && additional != false) {
      throw GeneratorException('${spec.id}: additionalProperties no soportado');
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

  /// Tipo Dart de `node`, propiedad `prop` de `owner`. `node` ya no es nullable.
  DType typeOf(ClassSpec owner, String prop, Json node) {
    final ref = node[r'$ref'];
    if (ref is String) {
      final id = resolve(owner.id.service, ref);
      final target = schema(id);
      if (isObject(target)) return DClass(id, core: coreClasses.contains(id));
      if (isStringEnum(target)) return DEnum(id);
      final (inner, nullable) = unwrapNullable(target);
      if (nullable) {
        throw GeneratorException(
          '$id: un esquema con nombre no puede ser nullable',
        );
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
          throw GeneratorException('${owner.id}.$prop: array sin items');
        }
        final (inner, nullable) = unwrapNullable(items);
        if (nullable) {
          throw GeneratorException(
            '${owner.id}.$prop: items nullable no soportado',
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
        throw GeneratorException('${owner.id}.$prop: tipo no soportado $node');
    }
  }
}
