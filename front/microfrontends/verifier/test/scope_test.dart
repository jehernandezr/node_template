import 'package:auth/auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_verifier/src/data/fake_verifier_repository.dart';
import 'package:mf_verifier/src/data/verifier_repository.dart';
import 'package:mf_verifier/src/screens/verifier_screen.dart';
import 'package:shell_core/shell_core.dart';

DefaultShellServices _services({Map<Type, Object> extras = const {}}) =>
    DefaultShellServices(
      session: UserSession.anonymous(),
      eventBus: ShellEventBus(),
      extras: extras,
    );

VerifierRepository _repositoryOf(MicrofrontendScope scope) =>
    (buildVerifierScreen(scope) as VerifierScreen).repository;

void main() {
  test('one scope reuses its repository', () {
    final scope = MicrofrontendScope(_services());
    expect(identical(_repositoryOf(scope), _repositoryOf(scope)), isTrue);
  });

  test('fresh scopes do not share repositories', () {
    final first = MicrofrontendScope(_services());
    final second = MicrofrontendScope(_services());
    expect(identical(_repositoryOf(first), _repositoryOf(second)), isFalse);
  });

  test('uses the device key port provided by the shell extras', () async {
    final keyPort = FakeDeviceKeyPort();
    final scope = MicrofrontendScope(
      _services(extras: {DeviceKeyPort: keyPort}),
    );
    final repository = _repositoryOf(scope);

    final code = await repository.autoCode('challenge-1');

    expect(keyPort.signCount, 1);
    expect(code, matches(RegExp(r'^\d{8}$')));
  });

  test('falls back to FakeDeviceKeyPort when the shell has none', () async {
    final scope = MicrofrontendScope(_services());
    final repository = _repositoryOf(scope);

    final code = await repository.autoCode('challenge-1');

    expect(code, matches(RegExp(r'^\d{8}$')));
    expect(repository, isA<FakeVerifierRepository>());
  });
}
