// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
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
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

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

  /// No description provided for @appTitle.
  ///
  /// In es, this message translates to:
  /// **'Plataforma'**
  String get appTitle;

  /// No description provided for @actionRetry.
  ///
  /// In es, this message translates to:
  /// **'Reintentar'**
  String get actionRetry;

  /// No description provided for @actionCancel.
  ///
  /// In es, this message translates to:
  /// **'Cancelar'**
  String get actionCancel;

  /// No description provided for @actionSave.
  ///
  /// In es, this message translates to:
  /// **'Guardar'**
  String get actionSave;

  /// No description provided for @actionSignIn.
  ///
  /// In es, this message translates to:
  /// **'Iniciar sesión'**
  String get actionSignIn;

  /// No description provided for @actionSignOut.
  ///
  /// In es, this message translates to:
  /// **'Cerrar sesión'**
  String get actionSignOut;

  /// No description provided for @menuAccount.
  ///
  /// In es, this message translates to:
  /// **'Cuenta'**
  String get menuAccount;

  /// No description provided for @menuTasks.
  ///
  /// In es, this message translates to:
  /// **'Tareas'**
  String get menuTasks;

  /// No description provided for @menuNotifications.
  ///
  /// In es, this message translates to:
  /// **'Notificaciones'**
  String get menuNotifications;

  /// No description provided for @menuAssistant.
  ///
  /// In es, this message translates to:
  /// **'Asistente'**
  String get menuAssistant;

  /// No description provided for @menuBilling.
  ///
  /// In es, this message translates to:
  /// **'Facturación'**
  String get menuBilling;

  /// No description provided for @menuBackoffice.
  ///
  /// In es, this message translates to:
  /// **'Administración'**
  String get menuBackoffice;

  /// No description provided for @menuVerifier.
  ///
  /// In es, this message translates to:
  /// **'Verificador'**
  String get menuVerifier;

  /// No description provided for @menuMore.
  ///
  /// In es, this message translates to:
  /// **'Más'**
  String get menuMore;

  /// No description provided for @demoModeTitle.
  ///
  /// In es, this message translates to:
  /// **'Modo demostración'**
  String get demoModeTitle;

  /// No description provided for @demoModeHint.
  ///
  /// In es, this message translates to:
  /// **'Estás viendo datos de ejemplo. Elige un perfil para entrar.'**
  String get demoModeHint;

  /// No description provided for @demoSignInCustomer.
  ///
  /// In es, this message translates to:
  /// **'Entrar como cliente'**
  String get demoSignInCustomer;

  /// No description provided for @demoSignInCustomerNoAssistant.
  ///
  /// In es, this message translates to:
  /// **'Entrar como cliente sin asistente'**
  String get demoSignInCustomerNoAssistant;

  /// No description provided for @demoSignInTenantAdmin.
  ///
  /// In es, this message translates to:
  /// **'Entrar como administrador del tenant'**
  String get demoSignInTenantAdmin;

  /// No description provided for @demoSignInSuperAdmin.
  ///
  /// In es, this message translates to:
  /// **'Entrar como superadministrador'**
  String get demoSignInSuperAdmin;

  /// No description provided for @forbiddenTitle.
  ///
  /// In es, this message translates to:
  /// **'Acceso denegado'**
  String get forbiddenTitle;

  /// No description provided for @forbiddenMessage.
  ///
  /// In es, this message translates to:
  /// **'No tienes permiso para ver esta página.'**
  String get forbiddenMessage;

  /// No description provided for @stepUpTitle.
  ///
  /// In es, this message translates to:
  /// **'Verificación adicional'**
  String get stepUpTitle;

  /// No description provided for @stepUpMessage.
  ///
  /// In es, this message translates to:
  /// **'Esta sección exige que confirmes tu identidad con un segundo factor.'**
  String get stepUpMessage;

  /// No description provided for @stepUpDemoVerify.
  ///
  /// In es, this message translates to:
  /// **'Verificar (demostración)'**
  String get stepUpDemoVerify;

  /// No description provided for @goHome.
  ///
  /// In es, this message translates to:
  /// **'Ir al inicio'**
  String get goHome;

  /// No description provided for @loading.
  ///
  /// In es, this message translates to:
  /// **'Cargando'**
  String get loading;

  /// No description provided for @errorCodeLabel.
  ///
  /// In es, this message translates to:
  /// **'Código'**
  String get errorCodeLabel;

  /// No description provided for @errorTraceIdLabel.
  ///
  /// In es, this message translates to:
  /// **'ID de traza'**
  String get errorTraceIdLabel;

  /// No description provided for @notFound.
  ///
  /// In es, this message translates to:
  /// **'Página no encontrada.'**
  String get notFound;

  /// No description provided for @confirm.
  ///
  /// In es, this message translates to:
  /// **'Confirmar'**
  String get confirm;

  /// No description provided for @delete.
  ///
  /// In es, this message translates to:
  /// **'Eliminar'**
  String get delete;

  /// No description provided for @edit.
  ///
  /// In es, this message translates to:
  /// **'Editar'**
  String get edit;

  /// No description provided for @close.
  ///
  /// In es, this message translates to:
  /// **'Cerrar'**
  String get close;

  /// No description provided for @back.
  ///
  /// In es, this message translates to:
  /// **'Volver'**
  String get back;

  /// No description provided for @search.
  ///
  /// In es, this message translates to:
  /// **'Buscar'**
  String get search;

  /// No description provided for @loadMore.
  ///
  /// In es, this message translates to:
  /// **'Cargar más'**
  String get loadMore;

  /// No description provided for @emptyListTitle.
  ///
  /// In es, this message translates to:
  /// **'Todavía no hay elementos.'**
  String get emptyListTitle;

  /// No description provided for @error_platform_validation_invalid_input.
  ///
  /// In es, this message translates to:
  /// **'Revisa los datos. Algún campo tiene un formato no válido.'**
  String get error_platform_validation_invalid_input;

  /// No description provided for @error_platform_validation_required.
  ///
  /// In es, this message translates to:
  /// **'Falta completar un campo obligatorio.'**
  String get error_platform_validation_required;

  /// No description provided for @error_platform_internal_unexpected.
  ///
  /// In es, this message translates to:
  /// **'Ocurrió un error inesperado. Intenta de nuevo.'**
  String get error_platform_internal_unexpected;

  /// No description provided for @error_platform_auth_unauthenticated.
  ///
  /// In es, this message translates to:
  /// **'Inicia sesión para continuar.'**
  String get error_platform_auth_unauthenticated;

  /// No description provided for @error_platform_auth_forbidden.
  ///
  /// In es, this message translates to:
  /// **'No tienes permiso para realizar esta acción.'**
  String get error_platform_auth_forbidden;

  /// No description provided for @error_platform_rate_limit_exceeded.
  ///
  /// In es, this message translates to:
  /// **'Hiciste demasiadas solicitudes. Espera un momento.'**
  String get error_platform_rate_limit_exceeded;

  /// No description provided for @error_platform_api_version_sunset.
  ///
  /// In es, this message translates to:
  /// **'Esta versión de la aplicación ya no está disponible. Actualízala.'**
  String get error_platform_api_version_sunset;

  /// No description provided for @error_platform_resource_not_found.
  ///
  /// In es, this message translates to:
  /// **'No encontramos lo que buscas.'**
  String get error_platform_resource_not_found;

  /// No description provided for @error_platform_conflict_version_mismatch.
  ///
  /// In es, this message translates to:
  /// **'El contenido cambió. Vuelve a cargarlo.'**
  String get error_platform_conflict_version_mismatch;

  /// No description provided for @error_platform_kernel_invalid_id.
  ///
  /// In es, this message translates to:
  /// **'El identificador no es válido.'**
  String get error_platform_kernel_invalid_id;

  /// No description provided for @error_platform_sharding_key_missing.
  ///
  /// In es, this message translates to:
  /// **'Falta un dato necesario para procesar la solicitud.'**
  String get error_platform_sharding_key_missing;

  /// No description provided for @error_platform_sharding_cross_shard_tx.
  ///
  /// In es, this message translates to:
  /// **'No podemos completar esta operación con datos guardados en lugares distintos.'**
  String get error_platform_sharding_cross_shard_tx;

  /// No description provided for @error_platform_sharding_tenant_migrating.
  ///
  /// In es, this message translates to:
  /// **'Estamos actualizando tus datos. Intenta de nuevo en unos minutos.'**
  String get error_platform_sharding_tenant_migrating;

  /// No description provided for @errorFallback.
  ///
  /// In es, this message translates to:
  /// **'Algo salió mal. Intenta de nuevo.'**
  String get errorFallback;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
