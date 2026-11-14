import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_shell/src/deep_links/deep_link_mapper.dart';
import 'package:mobile_shell/src/mobile_shell.dart';
import 'package:shell_core/shell_core.dart';

/// The links of the mobile shell are those its manifests declare.
MicrofrontendRegistry _mobileRegistry() {
  final registry = MicrofrontendRegistry();
  mobileManifests.forEach(registry.register);
  return registry;
}

void main() {
  final registry = _mobileRegistry();
  final mapper = DeepLinkMapper(registry);

  group('DeepLinkMapper', () {
    test('maps the verifier challenge from the custom scheme', () {
      expect(
        mapper.map(Uri.parse('nodetemplate://verifier?challenge=abc-123')),
        '/verifier?challenge=abc-123',
      );
    });

    test('maps a task link on the web host', () {
      expect(
        mapper.map(Uri.parse('https://app.example.test/tasks/t_42')),
        '/tasks/t_42',
      );
    });

    test('maps a task link from the custom scheme', () {
      expect(mapper.map(Uri.parse('nodetemplate://tasks/t_42')), '/tasks/t_42');
    });

    test('maps a verifier link on the web host', () {
      expect(
        mapper.map(Uri.parse('https://app.example.test/verifier?challenge=c1')),
        '/verifier?challenge=c1',
      );
    });

    test('ignores unknown schemes', () {
      expect(mapper.map(Uri.parse('otherapp://tasks/t_42')), isNull);
      expect(
        mapper.map(Uri.parse('http://app.example.test/tasks/t_42')),
        isNull,
      );
    });

    test('ignores unknown hosts', () {
      expect(
        mapper.map(Uri.parse('https://evil.example.com/tasks/t_42')),
        isNull,
      );
    });

    test('ignores unknown sections', () {
      expect(mapper.map(Uri.parse('nodetemplate://billing/x1')), isNull);
      expect(mapper.map(Uri.parse('https://app.example.test/')), isNull);
    });

    test('rejects a missing or malformed challenge', () {
      expect(mapper.map(Uri.parse('nodetemplate://verifier')), isNull);
      expect(
        mapper.map(Uri.parse('nodetemplate://verifier?challenge=')),
        isNull,
      );
      expect(
        mapper.map(Uri.parse('nodetemplate://verifier?challenge=..%2Fadmin')),
        isNull,
      );
    });

    test('rejects task ids with extra segments or unsafe characters', () {
      expect(mapper.map(Uri.parse('https://app.example.test/tasks')), isNull);
      expect(
        mapper.map(Uri.parse('https://app.example.test/tasks/a/b')),
        isNull,
      );
      expect(mapper.map(Uri.parse('nodetemplate://tasks/a%20b')), isNull);
    });

    test('rejects reserved child segments as task ids', () {
      expect(mapper.map(Uri.parse('nodetemplate://tasks/new')), isNull);
      expect(
        mapper.map(Uri.parse('https://app.example.test/tasks/new')),
        isNull,
      );
      expect(mapper.map(Uri.parse('nodetemplate://tasks/edit')), isNull);
      expect(
        mapper.map(Uri.parse('https://app.example.test/tasks/edit')),
        isNull,
      );
    });

    test('uses a custom web host when given', () {
      final custom = DeepLinkMapper(registry, webHost: 'other.test');
      expect(custom.map(Uri.parse('https://other.test/tasks/t1')), '/tasks/t1');
      expect(mapper.map(Uri.parse('https://other.test/tasks/t1')), isNull);
    });
  });
}
