import 'package:flutter_test/flutter_test.dart';
import 'package:mf_assistant/mf_assistant.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  test('manifest id matches package', () {
    expect(assistantManifest.id, MicrofrontendId.assistant);
  });
}
