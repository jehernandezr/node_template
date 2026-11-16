import 'package:new_microfrontend/new_microfrontend.dart';
import 'package:test/test.dart';

const String _pubspec = '''
name: front_workspace

workspace:
  - apps/web
  - microfrontends/tasks
  - packages/ui

dev_dependencies:
  flutter_lints: 6.0.0
''';

void main() {
  const editor = WorkspacePubspec();

  test('inserts a member in sorted position and keeps the rest', () {
    final result = editor.addMember(_pubspec, 'microfrontends/reports');

    expect(
      result,
      _pubspec.replaceFirst(
        '  - microfrontends/tasks',
        '  - microfrontends/reports\n  - microfrontends/tasks',
      ),
    );
  });

  test('appends a member that sorts last', () {
    final result = editor.addMember(_pubspec, 'tools/x');

    expect(
      result,
      _pubspec.replaceFirst('  - packages/ui', '  - packages/ui\n  - tools/x'),
    );
  });

  test('puts a member that sorts first before the others', () {
    final result = editor.addMember(_pubspec, 'apps/a');

    expect(
      result,
      _pubspec.replaceFirst('  - apps/web', '  - apps/a\n  - apps/web'),
    );
    expect(result.replaceFirst('  - apps/a\n', ''), _pubspec);
  });

  test('refuses a member that is already listed', () {
    expect(
      () => editor.addMember(_pubspec, 'apps/web'),
      throwsA(isA<ScaffoldException>()),
    );
  });

  test('refuses a pubspec without a workspace list', () {
    expect(
      () => editor.addMember('name: x\n', 'tools/x'),
      throwsA(isA<ScaffoldException>()),
    );
  });
}
