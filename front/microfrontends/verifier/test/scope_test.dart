import 'package:test_utils/test_utils.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_verifier/src/data/fake_verifier_repository.dart';
import 'package:mf_verifier/src/data/verifier_repository.dart';
import 'package:mf_verifier/src/screens/verifier_screen.dart';
import 'package:shell_core/shell_core.dart';

import 'support.dart';

VerifierRepository _repositoryOf(MicrofrontendScope scope) =>
    (buildVerifierScreen(scope) as VerifierScreen).repository;

void main() {
  test('one scope reuses its repository', () {
    final scope = MicrofrontendScope(services());
    expect(identical(_repositoryOf(scope), _repositoryOf(scope)), isTrue);
  });

  test('fresh scopes do not share repositories', () {
    final first = MicrofrontendScope(services());
    final second = MicrofrontendScope(services());
    expect(identical(_repositoryOf(first), _repositoryOf(second)), isFalse);
  });

  test('a new scope does not see the challenge of another', () async {
    final first = MicrofrontendScope(services());
    final second = MicrofrontendScope(services());
    (_repositoryOf(first) as FakeVerifierRepository).push(challenge);

    expect(await _repositoryOf(first).pending().first, challenge);
    expect(await _repositoryOf(second).pending().first, isNull);
  });

  test('demo mode signs with the demo device key', () async {
    final scope = MicrofrontendScope(services());
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
    final scope = MicrofrontendScope(services());
    final repository = _repositoryOf(scope) as FakeVerifierRepository;

    await scope.dispose();

    expect(() => repository.push(challenge), throwsStateError);
  });
}
