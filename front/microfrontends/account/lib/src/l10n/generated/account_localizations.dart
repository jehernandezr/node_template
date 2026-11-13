// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'account_localizations_en.dart';
import 'account_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AccountLocalizations
/// returned by `AccountLocalizations.of(context)`.
///
/// Applications need to include `AccountLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/account_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AccountLocalizations.localizationsDelegates,
///   supportedLocales: AccountLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AccountLocalizations.supportedLocales
/// property.
abstract class AccountLocalizations {
  AccountLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AccountLocalizations of(BuildContext context) {
    return Localizations.of<AccountLocalizations>(
      context,
      AccountLocalizations,
    )!;
  }

  static const LocalizationsDelegate<AccountLocalizations> delegate =
      _AccountLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('es'),
  ];

  /// No description provided for @overviewTitle.
  ///
  /// In es, this message translates to:
  /// **'Mi cuenta'**
  String get overviewTitle;

  /// No description provided for @organizationLine.
  ///
  /// In es, this message translates to:
  /// **'Organización: {tenantName}'**
  String organizationLine(String tenantName);

  /// No description provided for @manageSection.
  ///
  /// In es, this message translates to:
  /// **'Administrar'**
  String get manageSection;

  /// No description provided for @sessionsLinkMessage.
  ///
  /// In es, this message translates to:
  /// **'Dispositivos con sesión abierta y cierre remoto.'**
  String get sessionsLinkMessage;

  /// No description provided for @devicesLinkTitle.
  ///
  /// In es, this message translates to:
  /// **'Dispositivos'**
  String get devicesLinkTitle;

  /// No description provided for @devicesLinkMessage.
  ///
  /// In es, this message translates to:
  /// **'Dispositivos de confianza y verificador.'**
  String get devicesLinkMessage;

  /// No description provided for @securityLinkTitle.
  ///
  /// In es, this message translates to:
  /// **'Seguridad'**
  String get securityLinkTitle;

  /// No description provided for @securityLinkMessage.
  ///
  /// In es, this message translates to:
  /// **'Verificación en dos pasos, passkeys y códigos de recuperación.'**
  String get securityLinkMessage;

  /// No description provided for @agreementsLinkTitle.
  ///
  /// In es, this message translates to:
  /// **'Acuerdos'**
  String get agreementsLinkTitle;

  /// No description provided for @agreementsLinkMessage.
  ///
  /// In es, this message translates to:
  /// **'Términos, consentimientos y documentos firmados.'**
  String get agreementsLinkMessage;

  /// No description provided for @actionFailed.
  ///
  /// In es, this message translates to:
  /// **'La acción no se pudo completar. Intenta de nuevo.'**
  String get actionFailed;

  /// No description provided for @loadError.
  ///
  /// In es, this message translates to:
  /// **'No pudimos cargar esta información.'**
  String get loadError;

  /// No description provided for @versionLabel.
  ///
  /// In es, this message translates to:
  /// **'Versión {version}'**
  String versionLabel(String version);

  /// No description provided for @createdOnLabel.
  ///
  /// In es, this message translates to:
  /// **'Creada el {date}'**
  String createdOnLabel(String date);

  /// No description provided for @acceptedOnLabel.
  ///
  /// In es, this message translates to:
  /// **'Aceptado el {date}'**
  String acceptedOnLabel(String date);

  /// No description provided for @deadlineLabel.
  ///
  /// In es, this message translates to:
  /// **'Plazo hasta {date}'**
  String deadlineLabel(String date);

  /// No description provided for @trustedUntilLabel.
  ///
  /// In es, this message translates to:
  /// **'Confiable hasta {date}'**
  String trustedUntilLabel(String date);

  /// No description provided for @noTrustDate.
  ///
  /// In es, this message translates to:
  /// **'Sin fecha de confianza'**
  String get noTrustDate;

  /// No description provided for @lastSeenLabel.
  ///
  /// In es, this message translates to:
  /// **'Última actividad: {dateTime}'**
  String lastSeenLabel(String dateTime);

  /// No description provided for @stepUpTitle.
  ///
  /// In es, this message translates to:
  /// **'Confirma tu identidad'**
  String get stepUpTitle;

  /// No description provided for @stepUpMessage.
  ///
  /// In es, this message translates to:
  /// **'Esta acción es sensible. Ingresa el código de tu app de autenticación para continuar.'**
  String get stepUpMessage;

  /// No description provided for @stepUpCodeLabel.
  ///
  /// In es, this message translates to:
  /// **'Código de 6 dígitos'**
  String get stepUpCodeLabel;

  /// No description provided for @stepUpIncomplete.
  ///
  /// In es, this message translates to:
  /// **'Ingresa los 6 dígitos del código.'**
  String get stepUpIncomplete;

  /// No description provided for @stepUpInvalid.
  ///
  /// In es, this message translates to:
  /// **'El código no es válido. Intenta de nuevo.'**
  String get stepUpInvalid;

  /// No description provided for @sessionsTitle.
  ///
  /// In es, this message translates to:
  /// **'Sesiones activas'**
  String get sessionsTitle;

  /// No description provided for @sessionCurrent.
  ///
  /// In es, this message translates to:
  /// **'Actual'**
  String get sessionCurrent;

  /// No description provided for @sessionClose.
  ///
  /// In es, this message translates to:
  /// **'Cerrar sesión'**
  String get sessionClose;

  /// No description provided for @sessionClosed.
  ///
  /// In es, this message translates to:
  /// **'Sesión cerrada.'**
  String get sessionClosed;

  /// No description provided for @sessionsCloseOthers.
  ///
  /// In es, this message translates to:
  /// **'Cerrar todas las demás'**
  String get sessionsCloseOthers;

  /// No description provided for @othersClosed.
  ///
  /// In es, this message translates to:
  /// **'Sesiones cerradas: {count}.'**
  String othersClosed(int count);

  /// No description provided for @sessionsEmptyTitle.
  ///
  /// In es, this message translates to:
  /// **'No hay sesiones activas'**
  String get sessionsEmptyTitle;

  /// No description provided for @sessionsEmptyMessage.
  ///
  /// In es, this message translates to:
  /// **'Cuando inicies sesión en un dispositivo aparecerá aquí.'**
  String get sessionsEmptyMessage;

  /// No description provided for @devicesTitle.
  ///
  /// In es, this message translates to:
  /// **'Dispositivos'**
  String get devicesTitle;

  /// No description provided for @verifierBadge.
  ///
  /// In es, this message translates to:
  /// **'Verificador'**
  String get verifierBadge;

  /// No description provided for @deviceRemove.
  ///
  /// In es, this message translates to:
  /// **'Quitar'**
  String get deviceRemove;

  /// No description provided for @deviceRemoved.
  ///
  /// In es, this message translates to:
  /// **'Confianza del dispositivo retirada.'**
  String get deviceRemoved;

  /// No description provided for @devicesEmptyTitle.
  ///
  /// In es, this message translates to:
  /// **'No hay dispositivos de confianza'**
  String get devicesEmptyTitle;

  /// No description provided for @devicesEmptyMessage.
  ///
  /// In es, this message translates to:
  /// **'Los dispositivos en los que confías para verificar tu identidad aparecerán aquí.'**
  String get devicesEmptyMessage;

  /// No description provided for @securityTitle.
  ///
  /// In es, this message translates to:
  /// **'Seguridad'**
  String get securityTitle;

  /// No description provided for @mfaTitle.
  ///
  /// In es, this message translates to:
  /// **'Verificación en dos pasos'**
  String get mfaTitle;

  /// No description provided for @mfaEnabled.
  ///
  /// In es, this message translates to:
  /// **'Activa. Método: {method}'**
  String mfaEnabled(String method);

  /// No description provided for @mfaDisabled.
  ///
  /// In es, this message translates to:
  /// **'Inactiva. Activa la verificación en dos pasos.'**
  String get mfaDisabled;

  /// No description provided for @passkeysTitle.
  ///
  /// In es, this message translates to:
  /// **'Passkeys'**
  String get passkeysTitle;

  /// No description provided for @passkeyAdd.
  ///
  /// In es, this message translates to:
  /// **'Agregar passkey'**
  String get passkeyAdd;

  /// No description provided for @passkeyAdded.
  ///
  /// In es, this message translates to:
  /// **'Passkey agregada.'**
  String get passkeyAdded;

  /// No description provided for @passkeysEmpty.
  ///
  /// In es, this message translates to:
  /// **'Aún no tienes passkeys.'**
  String get passkeysEmpty;

  /// No description provided for @recoveryTitle.
  ///
  /// In es, this message translates to:
  /// **'Códigos de recuperación'**
  String get recoveryTitle;

  /// No description provided for @recoveryDescription.
  ///
  /// In es, this message translates to:
  /// **'Te permiten entrar si pierdes acceso a tus dispositivos. Cada código sirve una sola vez.'**
  String get recoveryDescription;

  /// No description provided for @recoveryRegenerate.
  ///
  /// In es, this message translates to:
  /// **'Regenerar códigos de recuperación'**
  String get recoveryRegenerate;

  /// No description provided for @recoveryRegenerated.
  ///
  /// In es, this message translates to:
  /// **'Códigos de recuperación regenerados.'**
  String get recoveryRegenerated;

  /// No description provided for @recoveryCodesTitle.
  ///
  /// In es, this message translates to:
  /// **'Nuevos códigos de recuperación'**
  String get recoveryCodesTitle;

  /// No description provided for @recoveryCodesNotice.
  ///
  /// In es, this message translates to:
  /// **'Guárdalos en un lugar seguro. Los códigos anteriores ya no funcionan.'**
  String get recoveryCodesNotice;

  /// No description provided for @agreementsTitle.
  ///
  /// In es, this message translates to:
  /// **'Acuerdos'**
  String get agreementsTitle;

  /// No description provided for @pendingSection.
  ///
  /// In es, this message translates to:
  /// **'Pendientes'**
  String get pendingSection;

  /// No description provided for @acceptedSection.
  ///
  /// In es, this message translates to:
  /// **'Aceptados'**
  String get acceptedSection;

  /// No description provided for @reviewAndAccept.
  ///
  /// In es, this message translates to:
  /// **'Revisar y aceptar'**
  String get reviewAndAccept;

  /// No description provided for @accept.
  ///
  /// In es, this message translates to:
  /// **'Aceptar'**
  String get accept;

  /// No description provided for @requiredLabel.
  ///
  /// In es, this message translates to:
  /// **'Obligatorio'**
  String get requiredLabel;

  /// No description provided for @optionalLabel.
  ///
  /// In es, this message translates to:
  /// **'Opcional'**
  String get optionalLabel;

  /// No description provided for @reviewNotice.
  ///
  /// In es, this message translates to:
  /// **'Al aceptar confirmas que revisaste este documento.'**
  String get reviewNotice;

  /// No description provided for @agreementAccepted.
  ///
  /// In es, this message translates to:
  /// **'Acuerdo aceptado.'**
  String get agreementAccepted;

  /// No description provided for @pendingEmptyTitle.
  ///
  /// In es, this message translates to:
  /// **'No tienes acuerdos pendientes'**
  String get pendingEmptyTitle;

  /// No description provided for @acceptedEmptyMessage.
  ///
  /// In es, this message translates to:
  /// **'Todavía no has aceptado acuerdos.'**
  String get acceptedEmptyMessage;

  /// No description provided for @platformIos.
  ///
  /// In es, this message translates to:
  /// **'iOS'**
  String get platformIos;

  /// No description provided for @platformAndroid.
  ///
  /// In es, this message translates to:
  /// **'Android'**
  String get platformAndroid;

  /// No description provided for @platformWeb.
  ///
  /// In es, this message translates to:
  /// **'Web'**
  String get platformWeb;

  /// No description provided for @platformMacos.
  ///
  /// In es, this message translates to:
  /// **'macOS'**
  String get platformMacos;

  /// No description provided for @platformWindows.
  ///
  /// In es, this message translates to:
  /// **'Windows'**
  String get platformWindows;

  /// No description provided for @platformLinux.
  ///
  /// In es, this message translates to:
  /// **'Linux'**
  String get platformLinux;

  /// No description provided for @factorDeviceOtp.
  ///
  /// In es, this message translates to:
  /// **'Dispositivo verificador'**
  String get factorDeviceOtp;

  /// No description provided for @factorEmailOtp.
  ///
  /// In es, this message translates to:
  /// **'Código por correo'**
  String get factorEmailOtp;

  /// No description provided for @factorTotp.
  ///
  /// In es, this message translates to:
  /// **'App de autenticación'**
  String get factorTotp;

  /// No description provided for @factorRecoveryCode.
  ///
  /// In es, this message translates to:
  /// **'Código de recuperación'**
  String get factorRecoveryCode;

  /// No description provided for @factorPasskey.
  ///
  /// In es, this message translates to:
  /// **'Passkey'**
  String get factorPasskey;
}

class _AccountLocalizationsDelegate
    extends LocalizationsDelegate<AccountLocalizations> {
  const _AccountLocalizationsDelegate();

  @override
  Future<AccountLocalizations> load(Locale locale) {
    return SynchronousFuture<AccountLocalizations>(
      lookupAccountLocalizations(locale),
    );
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AccountLocalizationsDelegate old) => false;
}

AccountLocalizations lookupAccountLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AccountLocalizationsEn();
    case 'es':
      return AccountLocalizationsEs();
  }

  throw FlutterError(
    'AccountLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
