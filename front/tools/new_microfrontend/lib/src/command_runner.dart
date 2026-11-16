import 'dart:io';

/// Runs an external command. A port so the CLI is tested without Flutter.
abstract interface class CommandRunner {
  /// Runs [executable] with [arguments] in [workingDirectory] and returns its
  /// exit code. Its output goes to the terminal.
  Future<int> run(
    String executable,
    List<String> arguments, {
    required Directory workingDirectory,
  });
}

/// [CommandRunner] over `Process`, with the output inherited from this
/// process.
final class ProcessCommandRunner implements CommandRunner {
  /// Creates the runner.
  const ProcessCommandRunner();

  @override
  Future<int> run(
    String executable,
    List<String> arguments, {
    required Directory workingDirectory,
  }) async {
    final process = await Process.start(
      executable,
      arguments,
      workingDirectory: workingDirectory.path,
      mode: ProcessStartMode.inheritStdio,
    );
    return process.exitCode;
  }
}
