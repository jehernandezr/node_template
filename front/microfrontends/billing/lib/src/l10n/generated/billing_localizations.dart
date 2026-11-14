// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'billing_localizations_en.dart';
import 'billing_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of BillingLocalizations
/// returned by `BillingLocalizations.of(context)`.
///
/// Applications need to include `BillingLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/billing_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: BillingLocalizations.localizationsDelegates,
///   supportedLocales: BillingLocalizations.supportedLocales,
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
/// be consistent with the languages listed in the BillingLocalizations.supportedLocales
/// property.
abstract class BillingLocalizations {
  BillingLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static BillingLocalizations of(BuildContext context) {
    return Localizations.of<BillingLocalizations>(
      context,
      BillingLocalizations,
    )!;
  }

  static const LocalizationsDelegate<BillingLocalizations> delegate =
      _BillingLocalizationsDelegate();

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

  /// No description provided for @billingPageTitle.
  ///
  /// In es, this message translates to:
  /// **'Facturación'**
  String get billingPageTitle;

  /// No description provided for @invoicesTitle.
  ///
  /// In es, this message translates to:
  /// **'Facturas'**
  String get invoicesTitle;

  /// No description provided for @invoiceTitle.
  ///
  /// In es, this message translates to:
  /// **'Factura'**
  String get invoiceTitle;

  /// No description provided for @currentPlan.
  ///
  /// In es, this message translates to:
  /// **'Plan actual'**
  String get currentPlan;

  /// No description provided for @subscriptionStatus.
  ///
  /// In es, this message translates to:
  /// **'Estado de la suscripción'**
  String get subscriptionStatus;

  /// No description provided for @currentPeriod.
  ///
  /// In es, this message translates to:
  /// **'Periodo actual'**
  String get currentPeriod;

  /// No description provided for @usageTitle.
  ///
  /// In es, this message translates to:
  /// **'Uso del periodo'**
  String get usageTitle;

  /// No description provided for @quotaUsers.
  ///
  /// In es, this message translates to:
  /// **'Usuarios'**
  String get quotaUsers;

  /// No description provided for @quotaApiCalls.
  ///
  /// In es, this message translates to:
  /// **'Llamadas API'**
  String get quotaApiCalls;

  /// No description provided for @quotaStorageGb.
  ///
  /// In es, this message translates to:
  /// **'Almacenamiento (GB)'**
  String get quotaStorageGb;

  /// No description provided for @noQuotas.
  ///
  /// In es, this message translates to:
  /// **'Este plan no tiene cuotas medidas.'**
  String get noQuotas;

  /// No description provided for @changePlan.
  ///
  /// In es, this message translates to:
  /// **'Cambiar plan'**
  String get changePlan;

  /// No description provided for @changePlanTitle.
  ///
  /// In es, this message translates to:
  /// **'Cambiar de plan'**
  String get changePlanTitle;

  /// No description provided for @availablePlans.
  ///
  /// In es, this message translates to:
  /// **'Planes disponibles'**
  String get availablePlans;

  /// No description provided for @currentPlanBadge.
  ///
  /// In es, this message translates to:
  /// **'Actual'**
  String get currentPlanBadge;

  /// No description provided for @prorationNote.
  ///
  /// In es, this message translates to:
  /// **'Al confirmar, el cambio se prorratea según los días que restan del periodo: el nuevo plan aplica desde hoy y la diferencia se ajusta en la próxima factura.'**
  String get prorationNote;

  /// No description provided for @confirmChange.
  ///
  /// In es, this message translates to:
  /// **'Confirmar cambio'**
  String get confirmChange;

  /// No description provided for @changePlanError.
  ///
  /// In es, this message translates to:
  /// **'No pudimos cambiar el plan.'**
  String get changePlanError;

  /// No description provided for @viewInvoices.
  ///
  /// In es, this message translates to:
  /// **'Ver facturas'**
  String get viewInvoices;

  /// No description provided for @invoicePeriod.
  ///
  /// In es, this message translates to:
  /// **'Periodo'**
  String get invoicePeriod;

  /// No description provided for @charges.
  ///
  /// In es, this message translates to:
  /// **'Cargos'**
  String get charges;

  /// No description provided for @total.
  ///
  /// In es, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @fixedFee.
  ///
  /// In es, this message translates to:
  /// **'Cargo fijo'**
  String get fixedFee;

  /// No description provided for @usageCharge.
  ///
  /// In es, this message translates to:
  /// **'Uso medido'**
  String get usageCharge;

  /// No description provided for @download.
  ///
  /// In es, this message translates to:
  /// **'Descargar'**
  String get download;

  /// No description provided for @downloadPending.
  ///
  /// In es, this message translates to:
  /// **'La descarga de facturas estará disponible próximamente.'**
  String get downloadPending;

  /// No description provided for @noInvoicesTitle.
  ///
  /// In es, this message translates to:
  /// **'Aún no hay facturas'**
  String get noInvoicesTitle;

  /// No description provided for @noInvoicesMessage.
  ///
  /// In es, this message translates to:
  /// **'Las facturas aparecerán al cerrar cada periodo.'**
  String get noInvoicesMessage;

  /// No description provided for @invoiceNotFound.
  ///
  /// In es, this message translates to:
  /// **'No encontramos esta factura.'**
  String get invoiceNotFound;

  /// No description provided for @loadError.
  ///
  /// In es, this message translates to:
  /// **'No pudimos cargar la facturación.'**
  String get loadError;

  /// No description provided for @monthly.
  ///
  /// In es, this message translates to:
  /// **'Mensual'**
  String get monthly;

  /// No description provided for @annual.
  ///
  /// In es, this message translates to:
  /// **'Anual'**
  String get annual;

  /// No description provided for @subscriptionTrialing.
  ///
  /// In es, this message translates to:
  /// **'En prueba'**
  String get subscriptionTrialing;

  /// No description provided for @subscriptionActive.
  ///
  /// In es, this message translates to:
  /// **'Activa'**
  String get subscriptionActive;

  /// No description provided for @subscriptionPastDue.
  ///
  /// In es, this message translates to:
  /// **'Pago pendiente'**
  String get subscriptionPastDue;

  /// No description provided for @subscriptionSuspended.
  ///
  /// In es, this message translates to:
  /// **'Suspendida'**
  String get subscriptionSuspended;

  /// No description provided for @subscriptionCanceled.
  ///
  /// In es, this message translates to:
  /// **'Cancelada'**
  String get subscriptionCanceled;

  /// No description provided for @invoiceDraft.
  ///
  /// In es, this message translates to:
  /// **'Borrador'**
  String get invoiceDraft;

  /// No description provided for @invoiceIssued.
  ///
  /// In es, this message translates to:
  /// **'Emitida'**
  String get invoiceIssued;

  /// No description provided for @invoicePaid.
  ///
  /// In es, this message translates to:
  /// **'Pagada'**
  String get invoicePaid;

  /// No description provided for @invoiceFailed.
  ///
  /// In es, this message translates to:
  /// **'Fallida'**
  String get invoiceFailed;

  /// No description provided for @invoiceVoided.
  ///
  /// In es, this message translates to:
  /// **'Anulada'**
  String get invoiceVoided;

  /// No description provided for @periodRange.
  ///
  /// In es, this message translates to:
  /// **'{start} a {end}'**
  String periodRange(String start, String end);
}

class _BillingLocalizationsDelegate
    extends LocalizationsDelegate<BillingLocalizations> {
  const _BillingLocalizationsDelegate();

  @override
  Future<BillingLocalizations> load(Locale locale) {
    return SynchronousFuture<BillingLocalizations>(
      lookupBillingLocalizations(locale),
    );
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_BillingLocalizationsDelegate old) => false;
}

BillingLocalizations lookupBillingLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return BillingLocalizationsEn();
    case 'es':
      return BillingLocalizationsEs();
  }

  throw FlutterError(
    'BillingLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
