import 'dart:io';

import 'package:new_microfrontend/new_microfrontend.dart';
import 'package:test/test.dart';

void main() {
  test('returns the exit code of the command', () async {
    final code = await const ProcessCommandRunner().run('dart', [
      '--version',
    ], workingDirectory: Directory.current);

    expect(code, 0);
  });
}
