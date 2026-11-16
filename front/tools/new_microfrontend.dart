import 'dart:io';

import 'package:new_microfrontend/new_microfrontend.dart';

/// Entry point: `dart run front/tools/new_microfrontend.dart reports --menu
/// "Reportes"`.
Future<void> main(List<String> args) async {
  final toolsDirectory = File.fromUri(Platform.script).parent;
  exitCode = await ScaffoldCli(
    frontRoot: toolsDirectory.parent,
    runner: const ProcessCommandRunner(),
    out: stdout,
    err: stderr,
  ).run(args);
}
