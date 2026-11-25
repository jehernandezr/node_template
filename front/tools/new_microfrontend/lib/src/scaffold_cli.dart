import 'dart:io';

import 'command_runner.dart';
import 'microfrontend_scaffolder.dart';
import 'scaffold_exception.dart';
import 'scaffold_names.dart';
import 'scaffold_result.dart';

enum _ExitCode {
  ok(0),
  usage(64),
  failure(1);

  const _ExitCode(this.code);

  final int code;
}

const String _usageLine =
    'Usage: dart run front/tools/new_microfrontend.dart ID --menu "Spanish label" '
    '[--menu-en "English label"] [--no-install]';

/// Command line of the scaffolder.
///
/// `new_microfrontend.dart ID --menu "SPANISH LABEL" [--menu-en "ENGLISH
/// LABEL"] [--no-install]`
final class ScaffoldCli {
  /// Creates the CLI over [frontRoot]. Messages go to [out] and errors to
  /// [err]; [runner] runs `flutter pub get` and `flutter gen-l10n`.
  ScaffoldCli({
    required this.frontRoot,
    required this.runner,
    required this.out,
    required this.err,
  });

  /// The `front/` folder.
  final Directory frontRoot;

  /// Runs the follow-up commands.
  final CommandRunner runner;

  /// Normal output.
  final StringSink out;

  /// Error output.
  final StringSink err;

  /// Runs the CLI and returns the exit code: 0 on success, 64 for a usage
  /// error (missing id, missing `--menu`, unknown option), 1 when the
  /// scaffolder or a command fails.
  Future<int> run(List<String> args) async {
    String? id;
    String? menuEs;
    String? menuEn;
    var install = true;
    for (var i = 0; i < args.length; i++) {
      final arg = args[i];
      if (arg == '--menu' || arg == '--menu-en') {
        if (i + 1 >= args.length) {
          return _usageError('Missing value for $arg.');
        }
        final value = args[++i];
        if (arg == '--menu') {
          menuEs = value;
        } else {
          menuEn = value;
        }
      } else if (arg == '--no-install') {
        install = false;
      } else if (arg.startsWith('-')) {
        return _usageError('Unknown option: $arg.');
      } else if (id == null) {
        id = arg;
      } else {
        return _usageError('Unexpected extra argument: $arg.');
      }
    }
    if (id == null) return _usageError('Missing the microfrontend ID.');
    if (menuEs == null) return _usageError('Missing --menu "Spanish label".');

    final ScaffoldResult result;
    try {
      result = MicrofrontendScaffolder(frontRoot: frontRoot, id: id).create(
        menuLabelEs: menuEs,
        menuLabelEn: menuEn ?? ScaffoldNames.pascalOf(id),
      );
    } on ScaffoldException catch (error) {
      err.writeln(error.message);
      return _ExitCode.failure.code;
    }

    final microfrontend = Directory('${frontRoot.path}/microfrontends/$id');
    if (install) {
      final steps = [
        (
          executable: 'flutter',
          arguments: const ['pub', 'get'],
          directory: frontRoot,
        ),
        (
          executable: 'flutter',
          arguments: const ['gen-l10n'],
          directory: microfrontend,
        ),
        (
          executable: 'dart',
          arguments: const ['format', 'lib', 'test'],
          directory: microfrontend,
        ),
      ];
      for (final step in steps) {
        final code = await runner.run(
          step.executable,
          step.arguments,
          workingDirectory: step.directory,
        );
        if (code != 0) {
          err.writeln(
            'Failed `${step.executable} ${step.arguments.join(' ')}` in '
            '${step.directory.path} (code $code).',
          );
          return _ExitCode.failure.code;
        }
      }
    } else {
      out.writeln(
        'Still to run: flutter pub get (in front/), flutter gen-l10n and dart '
        'format lib test (in microfrontends/$id).',
      );
    }

    out.writeln('Created files:');
    for (final file in result.files) {
      out.writeln(file);
    }
    out.writeln('Shell web (apps/web/lib/src/web_shell.dart):');
    out.writeln(result.appImport);
    out.writeln('In webManifests:');
    out.writeln(result.appRegistration);
    out.writeln('Mobile shell (apps/mobile/lib/src/mobile_shell.dart):');
    out.writeln(result.appImport);
    out.writeln('In mobileManifests:');
    out.writeln(result.appRegistration);
    out.writeln(
      'In apps/web/pubspec.yaml and apps/mobile/pubspec.yaml, under dependencies:',
    );
    out.writeln(result.appDependency);
    return _ExitCode.ok.code;
  }

  int _usageError(String message) {
    err.writeln(message);
    err.writeln(_usageLine);
    return _ExitCode.usage.code;
  }
}
