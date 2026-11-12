// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'verifier_localizations_en.dart';
import 'verifier_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of VerifierLocalizations
/// returned by `VerifierLocalizations.of(context)`.
///
/// Applications need to include `VerifierLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/verifier_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: VerifierLocalizations.localizationsDelegates,
///   supportedLocales: VerifierLocalizations.supportedLocales,
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
/// be consistent with the languages listed in the VerifierLocalizations.supportedLocales
/// property.
abstract class VerifierLocalizations {
  VerifierLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static VerifierLocalizations of(BuildContext context) {
    return Localizations.of<VerifierLocalizations>(
      context,
      VerifierLocalizations,
    )!;
  }

  static const LocalizationsDelegate<VerifierLocalizations> delegate =
      _VerifierLocalizationsDelegate();

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

  /// No description provided for @title.
  ///
  /// In es, this message translates to:
  /// **'Verificador'**
  String get title;

  /// No description provided for @readyTitle.
  ///
  /// In es, this message translates to:
  /// **'Este dispositivo está listo'**
  String get readyTitle;

  /// No description provided for @readyMessage.
  ///
  /// In es, this message translates to:
  /// **'Cuando alguien intente iniciar sesión con tu cuenta desde otro dispositivo, aquí verás el código para aprobarlo.'**
  String get readyMessage;

  /// No description provided for @codeTitle.
  ///
  /// In es, this message translates to:
  /// **'Código de verificación'**
  String get codeTitle;

  /// No description provided for @codeMessage.
  ///
  /// In es, this message translates to:
  /// **'Ingrésalo en el dispositivo que intenta entrar. Solo lo ves tú.'**
  String get codeMessage;

  /// No description provided for @codeLoading.
  ///
  /// In es, this message translates to:
  /// **'Generando código...'**
  String get codeLoading;

  /// No description provided for @codeFailed.
  ///
  /// In es, this message translates to:
  /// **'No pudimos generar el código. Vuelve a abrir esta pantalla.'**
  String get codeFailed;

  /// No description provided for @copyCode.
  ///
  /// In es, this message translates to:
  /// **'Copiar código'**
  String get copyCode;

  /// No description provided for @codeCopied.
  ///
  /// In es, this message translates to:
  /// **'Código copiado'**
  String get codeCopied;

  /// Countdown label. remaining is already formatted as mm:ss.
  ///
  /// In es, this message translates to:
  /// **'Caduca en {remaining}'**
  String expiresIn(String remaining);

  /// No description provided for @contextTitle.
  ///
  /// In es, this message translates to:
  /// **'Detalles del intento'**
  String get contextTitle;

  /// No description provided for @browser.
  ///
  /// In es, this message translates to:
  /// **'Navegador'**
  String get browser;

  /// No description provided for @os.
  ///
  /// In es, this message translates to:
  /// **'Sistema'**
  String get os;

  /// No description provided for @city.
  ///
  /// In es, this message translates to:
  /// **'Ciudad aproximada'**
  String get city;

  /// No description provided for @ip.
  ///
  /// In es, this message translates to:
  /// **'Dirección IP'**
  String get ip;

  /// No description provided for @denyButton.
  ///
  /// In es, this message translates to:
  /// **'No fui yo'**
  String get denyButton;

  /// No description provided for @denyDialogTitle.
  ///
  /// In es, this message translates to:
  /// **'¿Bloquear este intento?'**
  String get denyDialogTitle;

  /// No description provided for @denyDialogBody.
  ///
  /// In es, this message translates to:
  /// **'Cancelaremos este intento y te enviaremos una alerta por email y push.'**
  String get denyDialogBody;

  /// No description provided for @denyConfirm.
  ///
  /// In es, this message translates to:
  /// **'Sí, bloquear'**
  String get denyConfirm;

  /// No description provided for @blockedTitle.
  ///
  /// In es, this message translates to:
  /// **'Intento bloqueado'**
  String get blockedTitle;

  /// No description provided for @blockedBody.
  ///
  /// In es, this message translates to:
  /// **'Bloqueamos el intento y enviamos una alerta a tus canales de contacto. Revisa tu seguridad si no reconoces esta actividad.'**
  String get blockedBody;

  /// No description provided for @denyFailed.
  ///
  /// In es, this message translates to:
  /// **'No pudimos bloquear el intento. Inténtalo de nuevo.'**
  String get denyFailed;
}

class _VerifierLocalizationsDelegate
    extends LocalizationsDelegate<VerifierLocalizations> {
  const _VerifierLocalizationsDelegate();

  @override
  Future<VerifierLocalizations> load(Locale locale) {
    return SynchronousFuture<VerifierLocalizations>(
      lookupVerifierLocalizations(locale),
    );
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_VerifierLocalizationsDelegate old) => false;
}

VerifierLocalizations lookupVerifierLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return VerifierLocalizationsEn();
    case 'es':
      return VerifierLocalizationsEs();
  }

  throw FlutterError(
    'VerifierLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
