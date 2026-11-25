import 'dart:io';

import 'package:new_microfrontend/new_microfrontend.dart';
import 'package:test/test.dart';

import 'utils/fake_command_runner.dart';
import 'utils/template_fixture.dart';

const String _frontPubspec =
    'name: front_workspace\n\nworkspace:\n  - microfrontends/tasks\n  - packages/ui\n';

void main() {
  late Directory frontRoot;
  late FakeCommandRunner runner;
  late StringBuffer out;
  late StringBuffer err;

  setUp(() {
    frontRoot = Directory.systemTemp.createTempSync('front_cli_');
    addTearDown(() => frontRoot.deleteSync(recursive: true));
    File('${frontRoot.path}/pubspec.yaml').writeAsStringSync(_frontPubspec);
    const TemplateFixture().copyInto(frontRoot);
    runner = FakeCommandRunner();
    out = StringBuffer();
    err = StringBuffer();
  });

  ScaffoldCli cli() =>
      ScaffoldCli(frontRoot: frontRoot, runner: runner, out: out, err: err);

  test('without an id it is a usage error', () async {
    expect(await cli().run(['--menu', 'Reportes']), 64);
    expect(err.toString(), contains('Usage:'));
  });

  test('without --menu it is a usage error', () async {
    expect(await cli().run(['reports']), 64);
    expect(err.toString(), contains('--menu'));
  });

  test('an unknown option is a usage error', () async {
    expect(await cli().run(['reports', '--menu', 'R', '--bogus']), 64);
  });

  test('an option without its value is a usage error', () async {
    expect(await cli().run(['reports', '--menu']), 64);
  });

  test('a second id is a usage error', () async {
    expect(await cli().run(['reports', 'other', '--menu', 'R']), 64);
    expect(err.toString(), contains('other'));
  });

  test('--menu-en puts its label in the English texts', () async {
    await cli().run([
      'reports',
      '--menu',
      'Reportes',
      '--menu-en',
      'Business reports',
      '--no-install',
    ]);

    final arb = File(
      '${frontRoot.path}/microfrontends/reports/lib/src/l10n/app_en.arb',
    ).readAsStringSync();
    expect(arb, contains('"screenTitle": "Business reports"'));
  });

  test('without --menu-en the English label is the capitalized id', () async {
    await cli().run(['reports', '--menu', 'Reportes', '--no-install']);

    final paths = File(
      '${frontRoot.path}/microfrontends/reports/lib/src/shared/constants/'
      'reports_paths.dart',
    ).readAsStringSync();
    expect(paths, contains("'en': 'Reports'"));
    expect(paths, contains("'es': 'Reportes'"));
  });

  test('an invalid id fails with the scaffolder message', () async {
    expect(await cli().run(['Bad', '--menu', 'Bad']), 1);
    expect(err.toString(), isNotEmpty);
    expect(runner.calls, isEmpty);
  });

  test('creates the package and runs the three commands in order', () async {
    final code = await cli().run(['reports', '--menu', 'Reportes']);

    expect(code, 0);
    expect(
      [
        for (final call in runner.calls)
          '${call.executable} ${call.arguments.join(' ')} @ '
              '${call.workingDirectory}',
      ],
      [
        'flutter pub get @ ${frontRoot.path}',
        'flutter gen-l10n @ ${frontRoot.path}/microfrontends/reports',
        'dart format lib test @ ${frontRoot.path}/microfrontends/reports',
      ],
    );
    expect(
      File('${frontRoot.path}/microfrontends/reports/pubspec.yaml')
          .existsSync(),
      isTrue,
    );
  });

  test('prints the lines to add to each app', () async {
    await cli().run(['reports', '--menu', 'Reportes']);

    final text = out.toString();
    expect(
      text,
      contains(
        "import 'package:mf_reports/mf_reports.dart' show reportsManifest;",
      ),
    );
    expect(text, contains('reportsManifest,'));
    expect(text, contains('  mf_reports:'));
    expect(text, contains('    path: ../../microfrontends/reports'));
  });

  test('with --no-install it creates the package and runs nothing', () async {
    final code = await cli().run([
      'reports',
      '--menu',
      'Reportes',
      '--no-install',
    ]);

    expect(code, 0);
    expect(runner.calls, isEmpty);
    expect(out.toString(), contains('flutter pub get'));
  });

  test('stops at the first command that fails', () async {
    runner = FakeCommandRunner(exitCode: 1);

    final code = await cli().run(['reports', '--menu', 'Reportes']);

    expect(code, 1);
    expect(runner.calls, hasLength(1));
    expect(err.toString(), contains('flutter'));
  });
}
