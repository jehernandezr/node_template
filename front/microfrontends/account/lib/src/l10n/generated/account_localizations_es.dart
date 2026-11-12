// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'account_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AccountLocalizationsEs extends AccountLocalizations {
  AccountLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get overviewTitle => 'Mi cuenta';

  @override
  String organizationLine(String tenantName) {
    return 'Organización: $tenantName';
  }

  @override
  String get manageSection => 'Administrar';

  @override
  String get sessionsLinkMessage =>
      'Dispositivos con sesión abierta y cierre remoto.';

  @override
  String get devicesLinkTitle => 'Dispositivos';

  @override
  String get devicesLinkMessage => 'Dispositivos de confianza y verificador.';

  @override
  String get securityLinkTitle => 'Seguridad';

  @override
  String get securityLinkMessage =>
      'Verificación en dos pasos, passkeys y códigos de recuperación.';

  @override
  String get agreementsLinkTitle => 'Acuerdos';

  @override
  String get agreementsLinkMessage =>
      'Términos, consentimientos y documentos firmados.';

  @override
  String get actionFailed =>
      'La acción no se pudo completar. Intenta de nuevo.';

  @override
  String get loadError => 'No pudimos cargar esta información.';

  @override
  String versionLabel(String version) {
    return 'Versión $version';
  }

  @override
  String createdOnLabel(String date) {
    return 'Creada el $date';
  }

  @override
  String acceptedOnLabel(String date) {
    return 'Aceptado el $date';
  }

  @override
  String deadlineLabel(String date) {
    return 'Plazo hasta $date';
  }

  @override
  String trustedUntilLabel(String date) {
    return 'Confiable hasta $date';
  }

  @override
  String get noTrustDate => 'Sin fecha de confianza';

  @override
  String lastSeenLabel(String dateTime) {
    return 'Última actividad: $dateTime';
  }

  @override
  String get stepUpTitle => 'Confirma tu identidad';

  @override
  String get stepUpMessage =>
      'Esta acción es sensible. Ingresa el código de tu app de autenticación para continuar.';

  @override
  String get stepUpCodeLabel => 'Código de 6 dígitos';

  @override
  String get stepUpIncomplete => 'Ingresa los 6 dígitos del código.';

  @override
  String get stepUpInvalid => 'El código no es válido. Intenta de nuevo.';

  @override
  String get sessionsTitle => 'Sesiones activas';

  @override
  String get sessionCurrent => 'Actual';

  @override
  String get sessionClose => 'Cerrar sesión';

  @override
  String get sessionClosed => 'Sesión cerrada.';

  @override
  String get sessionsCloseOthers => 'Cerrar todas las demás';

  @override
  String othersClosed(int count) {
    return 'Sesiones cerradas: $count.';
  }

  @override
  String get sessionsEmptyTitle => 'No hay sesiones activas';

  @override
  String get sessionsEmptyMessage =>
      'Cuando inicies sesión en un dispositivo aparecerá aquí.';

  @override
  String get devicesTitle => 'Dispositivos';

  @override
  String get verifierBadge => 'Verificador';

  @override
  String get deviceRemove => 'Quitar';

  @override
  String get deviceRemoved => 'Confianza del dispositivo retirada.';

  @override
  String get devicesEmptyTitle => 'No hay dispositivos de confianza';

  @override
  String get devicesEmptyMessage =>
      'Los dispositivos en los que confías para verificar tu identidad aparecerán aquí.';

  @override
  String get securityTitle => 'Seguridad';

  @override
  String get mfaTitle => 'Verificación en dos pasos';

  @override
  String mfaEnabled(String method) {
    return 'Activa. Método: $method';
  }

  @override
  String get mfaDisabled => 'Inactiva. Activa la verificación en dos pasos.';

  @override
  String get passkeysTitle => 'Passkeys';

  @override
  String get passkeyAdd => 'Agregar passkey';

  @override
  String get passkeyAdded => 'Passkey agregada.';

  @override
  String get passkeysEmpty => 'Aún no tienes passkeys.';

  @override
  String get recoveryTitle => 'Códigos de recuperación';

  @override
  String get recoveryDescription =>
      'Te permiten entrar si pierdes acceso a tus dispositivos. Cada código sirve una sola vez.';

  @override
  String get recoveryRegenerate => 'Regenerar códigos de recuperación';

  @override
  String get recoveryRegenerated => 'Códigos de recuperación regenerados.';

  @override
  String get recoveryCodesTitle => 'Nuevos códigos de recuperación';

  @override
  String get recoveryCodesNotice =>
      'Guárdalos en un lugar seguro. Los códigos anteriores ya no funcionan.';

  @override
  String get agreementsTitle => 'Acuerdos';

  @override
  String get pendingSection => 'Pendientes';

  @override
  String get acceptedSection => 'Aceptados';

  @override
  String get reviewAndAccept => 'Revisar y aceptar';

  @override
  String get accept => 'Aceptar';

  @override
  String get requiredLabel => 'Obligatorio';

  @override
  String get optionalLabel => 'Opcional';

  @override
  String get reviewNotice =>
      'Al aceptar confirmas que revisaste este documento.';

  @override
  String get agreementAccepted => 'Acuerdo aceptado.';

  @override
  String get pendingEmptyTitle => 'No tienes acuerdos pendientes';

  @override
  String get acceptedEmptyMessage => 'Todavía no has aceptado acuerdos.';
}
