import 'package:material_ui/material_ui.dart';
import 'package:shell_host/shell_host.dart';

import 'src/config.dart';
import 'src/web_shell.dart';

/// Demo mode by default; `--dart-define=API_BASE_URL=https://...` connects
/// the shell to the real API.
void main() {
  runApp(ShellHostApp(host: buildWebHost(connection: webIdentityConnection())));
}
