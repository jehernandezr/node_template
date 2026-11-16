import 'package:shell_core/shell_core.dart';

import 'demo_device_key.dart';
import 'fake_verifier_repository.dart';
import 'verifier_repository.dart';

/// How the verifier repository is created. Login challenges have no contract
/// yet, so it only exists in demo mode.
abstract final class VerifierData {
  static final RepositoryBinding<VerifierRepository> repository =
      RepositoryBinding<VerifierRepository>.demoOnly(
        demo: (services) => FakeVerifierRepository(const DemoDeviceKey()),
      );
}
