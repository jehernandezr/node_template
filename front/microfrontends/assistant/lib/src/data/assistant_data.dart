import 'package:shell_core/shell_core.dart';

import '../shared/constants/assistant_constants.dart';
import 'assistant_repository.dart';
import 'fake_assistant_repository.dart';

/// How the assistant repository is created for each shell mode.
///
/// The backend has no assistant contract yet, so only the demo exists.
abstract final class AssistantData {
  static final RepositoryBinding<AssistantRepository> repository =
      RepositoryBinding<AssistantRepository>.demoOnly(
        demo: (services) => FakeAssistantRepository(
          behavior: DemoBehavior(delay: assistantDemoDelay),
        ),
      );
}
