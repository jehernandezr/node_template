import 'dart:io';

import 'package:new_microfrontend/new_microfrontend.dart';
import 'package:test/test.dart';

void main() {
  late Directory dir;

  setUp(() {
    dir = Directory.systemTemp.createTempSync('templates_');
    addTearDown(() => dir.deleteSync(recursive: true));
  });

  test('reads the .tmpl files sorted by their path without the suffix', () {
    File('${dir.path}/sub/b.dart.tmpl')
      ..createSync(recursive: true)
      ..writeAsStringSync('b');
    File('${dir.path}/a.txt.tmpl')
      ..createSync()
      ..writeAsStringSync('a');
    File('${dir.path}/notes.md').writeAsStringSync('n');

    final files = TemplateDirectory(dir).read();

    expect(files.map((file) => file.relativePath), ['a.txt', 'sub/b.dart']);
    expect(files.map((file) => file.content), ['a', 'b']);
  });

  test('throws when the folder does not exist', () {
    expect(
      () => TemplateDirectory(Directory('${dir.path}/nope')).read(),
      throwsA(isA<ScaffoldException>()),
    );
  });

  test('throws when the folder holds no .tmpl file', () {
    File('${dir.path}/notes.md').writeAsStringSync('n');

    expect(
      () => TemplateDirectory(dir).read(),
      throwsA(isA<ScaffoldException>()),
    );
  });
}
