import 'package:flutter_test/flutter_test.dart';
import 'package:mf_verifier/src/data/fake_verifier_repository.dart';
import 'package:mf_verifier/src/data/verifier_data.dart';
import 'package:mf_verifier/src/data/verifier_repository.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/verifier_app.dart';

VerifierRepository _repositoryOf(MicrofrontendScope scope) =>
    scope.repository(VerifierData.repository);

/// A new identity's scope, released when the test ends.
MicrofrontendScope _scope() {
  final scope = VerifierTestApp.newScope();
  addTearDown(scope.dispose);
  return scope;
}

void main() {
  group('VerifierData', () {
    test('one scope reuses its repository', () {
      final scope = _scope();
      expect(identical(_repositoryOf(scope), _repositoryOf(scope)), isTrue);
    });

    test('fresh scopes do not share repositories', () {
      final first = _scope();
      final second = _scope();
      expect(identical(_repositoryOf(first), _repositoryOf(second)), isFalse);
    });

    test('a new scope does not see the challenge of another', () async {
      final first = _scope();
      final second = _scope();
      (_repositoryOf(first) as FakeVerifierRepository).push(
        VerifierTestApp.loginChallenge,
      );

      expect(
        await _repositoryOf(first).pending().first,
        VerifierTestApp.loginChallenge,
      );
      expect(await _repositoryOf(second).pending().first, isNull);
    });

    test('demo mode signs with the demo device key', () async {
      final scope = _scope();
      final repository = _repositoryOf(scope);

      expect(
        await repository.autoCode('challenge-1'),
        matches(RegExp(r'^\d{8}$')),
      );
      expect(repository, isA<FakeVerifierRepository>());
    });

    test('the code comes from the device key signature', () async {
      final keyPort = FakeDeviceKeyPort();
      final repository = FakeVerifierRepository(keyPort);
      addTearDown(repository.dispose);

      final code = await repository.autoCode('challenge-1');

      expect(keyPort.signCount, 1);
      expect(code, matches(RegExp(r'^\d{8}$')));
    });

    test('scope disposal disposes the repository without a callback', () async {
      final scope = VerifierTestApp.newScope();
      final repository = _repositoryOf(scope) as FakeVerifierRepository;

      await scope.dispose();

      expect(
        () => repository.push(VerifierTestApp.loginChallenge),
        throwsStateError,
      );
    });
  });
}
