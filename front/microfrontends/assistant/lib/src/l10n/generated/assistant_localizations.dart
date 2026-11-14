// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'assistant_localizations_en.dart';
import 'assistant_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AssistantLocalizations
/// returned by `AssistantLocalizations.of(context)`.
///
/// Applications need to include `AssistantLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/assistant_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AssistantLocalizations.localizationsDelegates,
///   supportedLocales: AssistantLocalizations.supportedLocales,
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
/// be consistent with the languages listed in the AssistantLocalizations.supportedLocales
/// property.
abstract class AssistantLocalizations {
  AssistantLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AssistantLocalizations of(BuildContext context) {
    return Localizations.of<AssistantLocalizations>(
      context,
      AssistantLocalizations,
    )!;
  }

  static const LocalizationsDelegate<AssistantLocalizations> delegate =
      _AssistantLocalizationsDelegate();

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
  /// **'Asistente'**
  String get title;

  /// No description provided for @chatTitle.
  ///
  /// In es, this message translates to:
  /// **'Conversación'**
  String get chatTitle;

  /// No description provided for @newConversation.
  ///
  /// In es, this message translates to:
  /// **'Nueva conversación'**
  String get newConversation;

  /// No description provided for @emptyConversations.
  ///
  /// In es, this message translates to:
  /// **'Aún no tienes conversaciones'**
  String get emptyConversations;

  /// No description provided for @listError.
  ///
  /// In es, this message translates to:
  /// **'No pudimos cargar tus conversaciones.'**
  String get listError;

  /// No description provided for @createError.
  ///
  /// In es, this message translates to:
  /// **'No pudimos crear la conversación.'**
  String get createError;

  /// No description provided for @loadMessagesError.
  ///
  /// In es, this message translates to:
  /// **'No pudimos cargar la conversación.'**
  String get loadMessagesError;

  /// No description provided for @genericError.
  ///
  /// In es, this message translates to:
  /// **'Ocurrió un error inesperado.'**
  String get genericError;

  /// No description provided for @quotaExceeded.
  ///
  /// In es, this message translates to:
  /// **'Alcanzaste el límite de consultas de tu plan.'**
  String get quotaExceeded;

  /// No description provided for @inputHint.
  ///
  /// In es, this message translates to:
  /// **'Escribe tu pregunta'**
  String get inputHint;

  /// No description provided for @send.
  ///
  /// In es, this message translates to:
  /// **'Enviar'**
  String get send;

  /// No description provided for @stop.
  ///
  /// In es, this message translates to:
  /// **'Detener'**
  String get stop;

  /// No description provided for @streaming.
  ///
  /// In es, this message translates to:
  /// **'Escribiendo...'**
  String get streaming;

  /// No description provided for @stopped.
  ///
  /// In es, this message translates to:
  /// **'Respuesta detenida.'**
  String get stopped;

  /// No description provided for @sources.
  ///
  /// In es, this message translates to:
  /// **'Fuentes'**
  String get sources;

  /// No description provided for @usage.
  ///
  /// In es, this message translates to:
  /// **'Tokens: {input} de entrada y {output} de salida'**
  String usage(int input, int output);

  /// No description provided for @toolRequestTitle.
  ///
  /// In es, this message translates to:
  /// **'El asistente quiere ejecutar una acción'**
  String get toolRequestTitle;

  /// No description provided for @toolConfirm.
  ///
  /// In es, this message translates to:
  /// **'Confirmar'**
  String get toolConfirm;

  /// No description provided for @toolCancel.
  ///
  /// In es, this message translates to:
  /// **'Cancelar'**
  String get toolCancel;

  /// No description provided for @toolConfirmed.
  ///
  /// In es, this message translates to:
  /// **'Acción confirmada'**
  String get toolConfirmed;

  /// No description provided for @toolRejected.
  ///
  /// In es, this message translates to:
  /// **'Acción cancelada'**
  String get toolRejected;
}

class _AssistantLocalizationsDelegate
    extends LocalizationsDelegate<AssistantLocalizations> {
  const _AssistantLocalizationsDelegate();

  @override
  Future<AssistantLocalizations> load(Locale locale) {
    return SynchronousFuture<AssistantLocalizations>(
      lookupAssistantLocalizations(locale),
    );
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AssistantLocalizationsDelegate old) => false;
}

AssistantLocalizations lookupAssistantLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AssistantLocalizationsEn();
    case 'es':
      return AssistantLocalizationsEs();
  }

  throw FlutterError(
    'AssistantLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
