import 'dart:io';

import 'package:new_microfrontend/new_microfrontend.dart';

/// Records the commands it is asked to run and answers each with [exitCode].
final class FakeCommandRunner implements CommandRunner {
  FakeCommandRunner({this.exitCode = 0});

  /// Code returned by every command.
  final int exitCode;

  /// Commands in the order they were run.
  final List<
    ({String executable, List<String> arguments, String workingDirectory})
  >
  calls = [];

  @override
  Future<int> run(
    String executable,
    List<String> arguments, {
    required Directory workingDirectory,
  }) async {
    calls.add((
      executable: executable,
      arguments: arguments,
      workingDirectory: workingDirectory.path,
    ));
    return exitCode;
  }
}
