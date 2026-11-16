import 'package:flutter_test/flutter_test.dart';

import '../utils/verifier_app.dart';

void main() {
  group('l10n', () {
    test('es strings', () {
      final es = VerifierTestApp.l10n('es');
      expect(es.title, 'Verificador');
      expect(es.denyButton, 'No fui yo');
      expect(es.expiresIn('02:30'), 'Caduca en 02:30');
      expect(es.expiresSoonAnnouncement(10), 'El código caduca en 10 segundos');
      expect(es.codeExpiredAnnouncement, 'El código caducó');
    });

    test('en strings', () {
      final en = VerifierTestApp.l10n('en');
      expect(en.title, 'Verifier');
      expect(en.denyButton, 'It was not me');
      expect(en.expiresIn('02:30'), 'Expires in 02:30');
      expect(en.expiresSoonAnnouncement(10), 'The code expires in 10 seconds');
      expect(en.codeExpiredAnnouncement, 'The code expired');
    });
  });
}
