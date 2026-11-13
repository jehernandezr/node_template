import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_verifier/mf_verifier.dart';
import 'package:shell_core/shell_core.dart';

final _import = RegExp(
  r'''^\s*(?:import|export)\s+'([^']+)'([^;]*);''',
  multiLine: true,
);

/// Files reachable from [entry] through non-deferred imports and exports.
Set<String> _eagerFiles(String entry) {
  final seen = <String>{};
  final pending = [File(entry).absolute.path];
  while (pending.isNotEmpty) {
    final path = pending.removeLast();
    if (!seen.add(path)) continue;
    final source = File(path).readAsStringSync();
    for (final match in _import.allMatches(source)) {
      final target = match.group(1)!;
      if ((match.group(2) ?? '').contains('deferred')) continue;
      if (target.startsWith('dart:')) continue;
      if (target.startsWith('package:mf_verifier/')) {
        final relative = target.substring('package:mf_verifier/'.length);
        pending.add(File('lib/$relative').absolute.path);
      } else if (!target.startsWith('package:')) {
        pending.add(File(path).parent.uri.resolve(target).toFilePath());
      }
    }
  }
  return seen;
}

void main() {
  test('manifest id, platform and menu', () {
    expect(verifierManifest.id, MicrofrontendId.verifier);
    expect(verifierManifest.platforms, {AppPlatform.mobile});
    expect(verifierManifest.menu.single.path, '/verifier');
  });

  test('it is not public: anonymous visitors are rejected', () {
    final anonymous = UserSession.anonymous();
    final signedIn = UserSession(userId: 'u1', tenantId: 't1');

    expect(
      verifierManifest.access.decide(anonymous),
      AccessDecision.signInRequired,
    );
    expect(verifierManifest.access.allows(signedIn), isTrue);
  });

  test('screens: one route with no extra access and no children', () {
    final route = verifierManifest.screens.single;

    expect(route.path, '/verifier');
    expect(route.access, isNull);
    expect(route.routes, isEmpty);
    expect(verifierManifest.hasLifecycle, isFalse);
  });

  test('the manifest does not import code that must be deferred', () {
    final files = _eagerFiles('lib/mf_verifier.dart');

    expect(files.length, greaterThanOrEqualTo(1));
    for (final path in files) {
      expect(path, isNot(contains('/lib/src/data/')));
      expect(path, isNot(contains('/lib/src/screens/')));
      expect(path, isNot(contains('/lib/src/l10n/')));
    }
  });
}
