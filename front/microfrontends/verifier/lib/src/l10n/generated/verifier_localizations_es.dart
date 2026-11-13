// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'verifier_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class VerifierLocalizationsEs extends VerifierLocalizations {
  VerifierLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get title => 'Verificador';

  @override
  String get loadError =>
      'No pudimos cargar el verificador. Inténtalo de nuevo.';

  @override
  String get readyTitle => 'Este dispositivo está listo';

  @override
  String get readyMessage =>
      'Cuando alguien intente iniciar sesión con tu cuenta desde otro dispositivo, aquí verás el código para aprobarlo.';

  @override
  String get codeTitle => 'Código de verificación';

  @override
  String get codeMessage =>
      'Ingrésalo en el dispositivo que intenta entrar. Solo lo ves tú.';

  @override
  String get codeLoading => 'Generando código...';

  @override
  String get codeFailed =>
      'No pudimos generar el código. Vuelve a abrir esta pantalla.';

  @override
  String get copyCode => 'Copiar código';

  @override
  String get codeCopied => 'Código copiado';

  @override
  String expiresIn(String remaining) {
    return 'Caduca en $remaining';
  }

  @override
  String get contextTitle => 'Detalles del intento';

  @override
  String get browser => 'Navegador';

  @override
  String get os => 'Sistema';

  @override
  String get city => 'Ciudad aproximada';

  @override
  String get ip => 'Dirección IP';

  @override
  String get denyButton => 'No fui yo';

  @override
  String get denyDialogTitle => '¿Bloquear este intento?';

  @override
  String get denyDialogBody =>
      'Cancelaremos este intento y te enviaremos una alerta por email y push.';

  @override
  String get denyConfirm => 'Sí, bloquear';

  @override
  String get blockedTitle => 'Intento bloqueado';

  @override
  String get blockedBody =>
      'Bloqueamos el intento y enviamos una alerta a tus canales de contacto. Revisa tu seguridad si no reconoces esta actividad.';

  @override
  String get denyFailed =>
      'No pudimos bloquear el intento. Inténtalo de nuevo.';
}
