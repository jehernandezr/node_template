// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'notifications_localizations_en.dart';
import 'notifications_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of NotificationsLocalizations
/// returned by `NotificationsLocalizations.of(context)`.
///
/// Applications need to include `NotificationsLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/notifications_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: NotificationsLocalizations.localizationsDelegates,
///   supportedLocales: NotificationsLocalizations.supportedLocales,
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
/// be consistent with the languages listed in the NotificationsLocalizations.supportedLocales
/// property.
abstract class NotificationsLocalizations {
  NotificationsLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static NotificationsLocalizations of(BuildContext context) {
    return Localizations.of<NotificationsLocalizations>(
      context,
      NotificationsLocalizations,
    )!;
  }

  static const LocalizationsDelegate<NotificationsLocalizations> delegate =
      _NotificationsLocalizationsDelegate();

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

  /// No description provided for @inboxTitle.
  ///
  /// In es, this message translates to:
  /// **'Notificaciones'**
  String get inboxTitle;

  /// No description provided for @preferencesTitle.
  ///
  /// In es, this message translates to:
  /// **'Preferencias de notificaciones'**
  String get preferencesTitle;

  /// No description provided for @preferencesTooltip.
  ///
  /// In es, this message translates to:
  /// **'Preferencias'**
  String get preferencesTooltip;

  /// No description provided for @markAllRead.
  ///
  /// In es, this message translates to:
  /// **'Marcar todas como leídas'**
  String get markAllRead;

  /// No description provided for @unreadLabel.
  ///
  /// In es, this message translates to:
  /// **'No leída'**
  String get unreadLabel;

  /// No description provided for @readLabel.
  ///
  /// In es, this message translates to:
  /// **'Leída'**
  String get readLabel;

  /// No description provided for @emptyTitle.
  ///
  /// In es, this message translates to:
  /// **'No tienes notificaciones'**
  String get emptyTitle;

  /// No description provided for @emptyMessage.
  ///
  /// In es, this message translates to:
  /// **'Aquí aparecerán los avisos de tu cuenta.'**
  String get emptyMessage;

  /// No description provided for @loadError.
  ///
  /// In es, this message translates to:
  /// **'No pudimos cargar tus notificaciones.'**
  String get loadError;

  /// No description provided for @saveError.
  ///
  /// In es, this message translates to:
  /// **'No pudimos guardar tus preferencias.'**
  String get saveError;

  /// No description provided for @typeHeader.
  ///
  /// In es, this message translates to:
  /// **'Tipo'**
  String get typeHeader;

  /// No description provided for @typeSecurityAlert.
  ///
  /// In es, this message translates to:
  /// **'Alertas de seguridad'**
  String get typeSecurityAlert;

  /// No description provided for @typeTaskUpdated.
  ///
  /// In es, this message translates to:
  /// **'Tareas'**
  String get typeTaskUpdated;

  /// No description provided for @typeInvoiceIssued.
  ///
  /// In es, this message translates to:
  /// **'Facturas'**
  String get typeInvoiceIssued;

  /// No description provided for @typeAccountActivity.
  ///
  /// In es, this message translates to:
  /// **'Actividad de la cuenta'**
  String get typeAccountActivity;

  /// No description provided for @channelInApp.
  ///
  /// In es, this message translates to:
  /// **'En la app'**
  String get channelInApp;

  /// No description provided for @channelPush.
  ///
  /// In es, this message translates to:
  /// **'Push'**
  String get channelPush;

  /// No description provided for @channelEmail.
  ///
  /// In es, this message translates to:
  /// **'Correo'**
  String get channelEmail;

  /// No description provided for @securityLocked.
  ///
  /// In es, this message translates to:
  /// **'Las alertas de seguridad siempre llegan por todos los canales.'**
  String get securityLocked;

  /// No description provided for @quietHoursTitle.
  ///
  /// In es, this message translates to:
  /// **'Horario de silencio'**
  String get quietHoursTitle;

  /// No description provided for @quietHoursStart.
  ///
  /// In es, this message translates to:
  /// **'Inicio'**
  String get quietHoursStart;

  /// No description provided for @quietHoursEnd.
  ///
  /// In es, this message translates to:
  /// **'Fin'**
  String get quietHoursEnd;

  /// No description provided for @quietHoursStartPicker.
  ///
  /// In es, this message translates to:
  /// **'Hora de inicio'**
  String get quietHoursStartPicker;

  /// No description provided for @quietHoursEndPicker.
  ///
  /// In es, this message translates to:
  /// **'Hora de fin'**
  String get quietHoursEndPicker;
}

class _NotificationsLocalizationsDelegate
    extends LocalizationsDelegate<NotificationsLocalizations> {
  const _NotificationsLocalizationsDelegate();

  @override
  Future<NotificationsLocalizations> load(Locale locale) {
    return SynchronousFuture<NotificationsLocalizations>(
      lookupNotificationsLocalizations(locale),
    );
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_NotificationsLocalizationsDelegate old) => false;
}

NotificationsLocalizations lookupNotificationsLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return NotificationsLocalizationsEn();
    case 'es':
      return NotificationsLocalizationsEs();
  }

  throw FlutterError(
    'NotificationsLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
