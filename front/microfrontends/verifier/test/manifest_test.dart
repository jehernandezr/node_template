import 'package:flutter_test/flutter_test.dart';
import 'package:mf_verifier/mf_verifier.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  test('manifest id matches package', () {
    expect(verifierManifest.id, MicrofrontendId.verifier);
  });
}
