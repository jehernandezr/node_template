import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/app.dart';
import 'src/config.dart';
import 'src/registry.dart';

/// Demo mode by default; `--dart-define=API_BASE_URL=https://...` connects
/// the shell to the real API.
void main() {
  runApp(
    MobileShellApp(
      registry: buildMobileRegistry(),
      session: ValueNotifier<UserSession>(UserSession.anonymous()),
      connection: mobileIdentityConnection(),
    ),
  );
}
