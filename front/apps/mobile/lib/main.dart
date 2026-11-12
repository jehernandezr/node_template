import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/app.dart';
import 'src/registry.dart';

void main() {
  runApp(
    MobileShellApp(
      registry: buildMobileRegistry(),
      session: ValueNotifier<UserSession>(UserSession.anonymous()),
    ),
  );
}
