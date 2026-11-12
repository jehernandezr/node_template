import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:contracts_gen/contracts_gen.dart';
import 'package:contracts_gen/src/naming.dart';
import 'package:test/test.dart';

Json _doc(String service, {Json schemas = const {}, Json enums = const {}}) => {
  'formatVersion': 1,
  'service': service,
  'enums': enums,
  'constants': {
    '${upperCamel(service)}Limits': {'max': 3, 'pattern': r'^a$', 'flag': true},
  },
  'schemas': schemas,
  'routes': <dynamic>[],
  'errors': <String, dynamic>{},
};

Json _platform() => {
  ..._doc(
    'platform',
    enums: {
      'PlatformErrorCode': {
        'values': [
          {
            'name': 'ValidationRequired',
            'value': 'PLATFORM.VALIDATION.REQUIRED',
          },
          {'name': 'SagaLeaseLost', 'value': 'PLATFORM.SAGA.LEASE_LOST'},
        ],
      },
      'HttpMethod': {
        'values': [
          {'name': 'Get', 'value': 'GET'},
        ],
      },
    },
    schemas: {
      'Id': {'type': 'string', 'format': 'uuid'},
    },
  ),
  'errors': {
    'PlatformErrorCode': [
      {
        'name': 'ValidationRequired',
        'code': 'PLATFORM.VALIDATION.REQUIRED',
        'httpStatus': 400,
        'retryable': false,
        'audience': 'public',
        'messageKey': 'error_platform_validation_required',
        'description': 'Falta un campo.',
      },
      {
        'name': 'SagaLeaseLost',
        'code': 'PLATFORM.SAGA.LEASE_LOST',
        'httpStatus': 409,
        'retryable': true,
        'audience': 'internal',
        'messageKey': 'error_platform_saga_lease_lost',
        'description': 'Interno.',
      },
    ],
  },
};

Json _sample() => _doc(
  'sample',
  schemas: {
    'Color': {
      'type': 'string',
      'enum': ['dark-red', 'blue'],
    },
    'Item': {
      'type': 'object',
      'properties': {
        'id': {r'$ref': '../../platform/export/contract.json#/schemas/Id'},
        'color': {r'$ref': '#/schemas/Color'},
        'size': {
          'type': 'object',
          'properties': {
            'width': {'type': 'integer', 'minimum': 1},
          },
          'required': ['width'],
        },
        'tags': {
          'type': 'array',
          'items': {'type': 'string', 'minLength': 2},
          'maxItems': 3,
        },
        'note': {
          'anyOf': [
            {'type': 'string'},
            {'type': 'null'},
          ],
        },
      },
      'required': ['id', 'color', 'size', 'tags', 'note'],
      'additionalProperties': false,
    },
  },
);

/// Igual que leer `contract.json` del disco: mapas `Map<String, dynamic>`.
ContractModel _model(Map<String, Json> docs) => ContractModel({
  for (final entry in docs.entries)
    entry.key: jsonDecode(jsonEncode(entry.value)) as Json,
});

void main() {
  group('naming', () {
    test('converts contract names to Dart identifiers', () {
      expect(memberFromKey('TasksRead'), 'tasksRead');
      expect(memberFromKey('Default'), 'defaultValue');
      expect(memberFromKey('Name'), 'nameValue');
      expect(lowerCamel('tasks:read'), 'tasksRead');
      expect(lowerCamel('dark-red'), 'darkRed');
      expect(upperCamel('size'), 'Size');
      expect(snake('file-storage'), 'file_storage');
      expect(dartString(r"a'b$c\d"), r"'a\'b\$c\\d'");
    });
  });

  group('generate', () {
    final files = generate(
      _model({'platform': _platform(), 'sample': _sample()}),
    );

    test(
      'writes one file per folder, a barrel per service and a global barrel',
      () {
        expect(
          files.keys,
          containsAll([
            'platform/enums/platform_enums.dart',
            'platform/constants/platform_constants.dart',
            'sample/types/sample_types.dart',
            'sample/schemas/sample_schemas.dart',
            'sample/sample.dart',
            'generated_contracts.dart',
          ]),
        );
        for (final content in files.values) {
          expect(content, startsWith(generatedHeader));
        }
      },
    );

    test('keeps only public codes in error enums, with their metadata', () {
      final enums = files['platform/enums/platform_enums.dart']!;
      expect(enums, contains('validationRequired('));
      expect(
        enums,
        contains("messageKey: 'error_platform_validation_required'"),
      );
      expect(enums, isNot(contains('sagaLeaseLost')));
      expect(
        enums,
        contains('static PlatformErrorCode? fromCode(String code)'),
      );
    });

    test(
      'generates enums from schemas, nested classes and cross-service refs',
      () {
        expect(files['sample/enums/sample_enums.dart'], contains('darkRed('));
        final types = files['sample/types/sample_types.dart']!;
        expect(types, contains('final class Item {'));
        expect(types, contains('final class ItemSize {'));
        expect(types, contains('final String? note;'));
        expect(types, contains('final List<String> tags;'));
        final schemas = files['sample/schemas/sample_schemas.dart']!;
        expect(schemas, contains('ItemSizeSchema.check('));
        expect(schemas, contains('uuidPattern.hasMatch'));
        expect(schemas, contains("joinPath(path, 'size')"));
      },
    );

    test('rejects unsupported schema keywords', () {
      final doc = _doc(
        'sample',
        schemas: {
          'Bad': {'type': 'object', 'properties': {}, 'patternProperties': {}},
        },
      );
      expect(
        () => generate(_model({'platform': _platform(), 'sample': doc})),
        throwsA(isA<GeneratorException>()),
      );
    });

    test('rejects two services that export the same Dart name', () {
      final clash = _doc(
        'sample',
        schemas: {
          'PlatformLimits': {'type': 'object'},
        },
      );
      expect(
        () => _model({'platform': _platform(), 'sample': clash}),
        throwsA(isA<GeneratorException>()),
      );
    });

    test('rejects an unknown format version and the reserved core name', () {
      expect(
        () => _model({
          'platform': {..._platform(), 'formatVersion': 2},
        }),
        throwsA(isA<GeneratorException>()),
      );
      expect(
        () => _model({'core': _doc('core')}),
        throwsA(isA<GeneratorException>()),
      );
    });
  });

  group('run', () {
    late Directory root;
    late Directory front;
    late Directory contracts;

    setUp(() {
      root = Directory.systemTemp.createTempSync('contracts_gen_test');
      front = Directory('${root.path}/front')..createSync();
      File('${front.path}/pubspec.yaml')
          .writeAsStringSync('name: front_workspace\n');
      contracts = Directory('${root.path}/backend/libs/contracts');
      for (final entry in {
        'platform': _platform(),
        'sample': _sample(),
      }.entries) {
        File('${contracts.path}/${entry.key}/export/contract.json')
          ..createSync(recursive: true)
          ..writeAsStringSync(jsonEncode(entry.value));
      }
    });

    tearDown(() => root.deleteSync(recursive: true));

    Future<int> runQuiet(List<String> args) {
      final sink = IOSink(_NullConsumer());
      return run(
        ['--front', front.path, ...args],
        stdoutSink: sink,
        stderrSink: sink,
      );
    }

    test('--check fails before generating and passes after', () async {
      expect(await runQuiet(['--check']), 1);
      expect(await runQuiet([]), 0);
      expect(await runQuiet(['--check']), 0);
    });

    test('--check detects edited and stale generated files', () async {
      await runQuiet([]);
      final src = '${front.path}/packages/contracts/lib/src';
      final types = File('$src/sample/types/sample_types.dart');
      types.writeAsStringSync('${types.readAsStringSync()}\n// edit');
      expect(await runQuiet(['--check']), 1);
      await runQuiet([]);
      File('$src/old/old.dart')
        ..createSync(recursive: true)
        ..writeAsStringSync('$generatedHeader\n');
      expect(await runQuiet(['--check']), 1);
      await runQuiet([]);
      expect(File('$src/old/old.dart').existsSync(), isFalse);
      expect(await runQuiet(['--check']), 0);
    });

    test('never touches hand-written core files', () async {
      final core =
          File('${front.path}/packages/contracts/lib/src/core/core.dart')
            ..createSync(recursive: true)
            ..writeAsStringSync('// hand-written\n');
      await runQuiet([]);
      expect(core.readAsStringSync(), '// hand-written\n');
    });

    test('rejects unknown arguments', () async {
      expect(await runQuiet(['--nope']), 64);
    });
  });
}

class _NullConsumer implements StreamConsumer<List<int>> {
  @override
  Future<void> addStream(Stream<List<int>> stream) => stream.drain<void>();

  @override
  Future<void> close() async {}
}
