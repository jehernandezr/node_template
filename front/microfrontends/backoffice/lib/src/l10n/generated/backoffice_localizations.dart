// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'backoffice_localizations_en.dart';
import 'backoffice_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of BackofficeLocalizations
/// returned by `BackofficeLocalizations.of(context)`.
///
/// Applications need to include `BackofficeLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/backoffice_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: BackofficeLocalizations.localizationsDelegates,
///   supportedLocales: BackofficeLocalizations.supportedLocales,
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
/// be consistent with the languages listed in the BackofficeLocalizations.supportedLocales
/// property.
abstract class BackofficeLocalizations {
  BackofficeLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static BackofficeLocalizations of(BuildContext context) {
    return Localizations.of<BackofficeLocalizations>(
      context,
      BackofficeLocalizations,
    )!;
  }

  static const LocalizationsDelegate<BackofficeLocalizations> delegate =
      _BackofficeLocalizationsDelegate();

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

  /// No description provided for @navOverview.
  ///
  /// In es, this message translates to:
  /// **'Resumen'**
  String get navOverview;

  /// No description provided for @navTenants.
  ///
  /// In es, this message translates to:
  /// **'Tenants'**
  String get navTenants;

  /// No description provided for @navSagas.
  ///
  /// In es, this message translates to:
  /// **'Sagas'**
  String get navSagas;

  /// No description provided for @navDlq.
  ///
  /// In es, this message translates to:
  /// **'Colas muertas'**
  String get navDlq;

  /// No description provided for @loadError.
  ///
  /// In es, this message translates to:
  /// **'No se pudo cargar la información. Intenta de nuevo.'**
  String get loadError;

  /// No description provided for @notFound.
  ///
  /// In es, this message translates to:
  /// **'No encontramos este registro.'**
  String get notFound;

  /// No description provided for @filterAll.
  ///
  /// In es, this message translates to:
  /// **'Todos'**
  String get filterAll;

  /// No description provided for @filterStatus.
  ///
  /// In es, this message translates to:
  /// **'Estado'**
  String get filterStatus;

  /// No description provided for @filterRegion.
  ///
  /// In es, this message translates to:
  /// **'Región'**
  String get filterRegion;

  /// No description provided for @actor.
  ///
  /// In es, this message translates to:
  /// **'Actor'**
  String get actor;

  /// No description provided for @action.
  ///
  /// In es, this message translates to:
  /// **'Acción'**
  String get action;

  /// No description provided for @entity.
  ///
  /// In es, this message translates to:
  /// **'Entidad'**
  String get entity;

  /// No description provided for @traceId.
  ///
  /// In es, this message translates to:
  /// **'Trace ID'**
  String get traceId;

  /// No description provided for @auditTitle.
  ///
  /// In es, this message translates to:
  /// **'Auditoría'**
  String get auditTitle;

  /// No description provided for @auditEmpty.
  ///
  /// In es, this message translates to:
  /// **'Sin registros de auditoría.'**
  String get auditEmpty;

  /// No description provided for @overviewTitle.
  ///
  /// In es, this message translates to:
  /// **'Backoffice'**
  String get overviewTitle;

  /// No description provided for @overviewSubtitle.
  ///
  /// In es, this message translates to:
  /// **'Estado de la plataforma en este momento.'**
  String get overviewSubtitle;

  /// No description provided for @cardTenants.
  ///
  /// In es, this message translates to:
  /// **'Tenants'**
  String get cardTenants;

  /// No description provided for @cardSagas.
  ///
  /// In es, this message translates to:
  /// **'Sagas que requieren intervención'**
  String get cardSagas;

  /// No description provided for @cardDlq.
  ///
  /// In es, this message translates to:
  /// **'Mensajes en colas muertas'**
  String get cardDlq;

  /// No description provided for @cardOpen.
  ///
  /// In es, this message translates to:
  /// **'Ver detalle'**
  String get cardOpen;

  /// No description provided for @tenantsTitle.
  ///
  /// In es, this message translates to:
  /// **'Tenants'**
  String get tenantsTitle;

  /// No description provided for @tenantSearchLabel.
  ///
  /// In es, this message translates to:
  /// **'Buscar por nombre o id'**
  String get tenantSearchLabel;

  /// No description provided for @tenantsEmpty.
  ///
  /// In es, this message translates to:
  /// **'Ningún tenant coincide con los filtros.'**
  String get tenantsEmpty;

  /// No description provided for @tenantDetailTitle.
  ///
  /// In es, this message translates to:
  /// **'Detalle del tenant'**
  String get tenantDetailTitle;

  /// No description provided for @tenantPlan.
  ///
  /// In es, this message translates to:
  /// **'Plan'**
  String get tenantPlan;

  /// No description provided for @tenantShardGroup.
  ///
  /// In es, this message translates to:
  /// **'Grupo de shards'**
  String get tenantShardGroup;

  /// No description provided for @tenantUsers.
  ///
  /// In es, this message translates to:
  /// **'Usuarios'**
  String get tenantUsers;

  /// No description provided for @tenantRegion.
  ///
  /// In es, this message translates to:
  /// **'Región'**
  String get tenantRegion;

  /// No description provided for @tenantStatusActive.
  ///
  /// In es, this message translates to:
  /// **'Activo'**
  String get tenantStatusActive;

  /// No description provided for @tenantStatusSuspended.
  ///
  /// In es, this message translates to:
  /// **'Suspendido'**
  String get tenantStatusSuspended;

  /// No description provided for @tenantStatusProvisioning.
  ///
  /// In es, this message translates to:
  /// **'Aprovisionando'**
  String get tenantStatusProvisioning;

  /// No description provided for @tenantStatusDeleting.
  ///
  /// In es, this message translates to:
  /// **'Eliminando'**
  String get tenantStatusDeleting;

  /// No description provided for @regionEuWest.
  ///
  /// In es, this message translates to:
  /// **'Europa oeste'**
  String get regionEuWest;

  /// No description provided for @regionUsEast.
  ///
  /// In es, this message translates to:
  /// **'Estados Unidos este'**
  String get regionUsEast;

  /// No description provided for @regionSaEast.
  ///
  /// In es, this message translates to:
  /// **'Sudamérica este'**
  String get regionSaEast;

  /// No description provided for @sagasTitle.
  ///
  /// In es, this message translates to:
  /// **'Sagas'**
  String get sagasTitle;

  /// No description provided for @sagasEmpty.
  ///
  /// In es, this message translates to:
  /// **'No hay sagas con este estado.'**
  String get sagasEmpty;

  /// No description provided for @sagaDetailTitle.
  ///
  /// In es, this message translates to:
  /// **'Detalle de la saga'**
  String get sagaDetailTitle;

  /// No description provided for @sagaType.
  ///
  /// In es, this message translates to:
  /// **'Tipo'**
  String get sagaType;

  /// No description provided for @sagaTenant.
  ///
  /// In es, this message translates to:
  /// **'Tenant'**
  String get sagaTenant;

  /// No description provided for @sagaCurrentStep.
  ///
  /// In es, this message translates to:
  /// **'Último paso'**
  String get sagaCurrentStep;

  /// No description provided for @sagaUpdated.
  ///
  /// In es, this message translates to:
  /// **'Actualizada'**
  String get sagaUpdated;

  /// No description provided for @sagaSteps.
  ///
  /// In es, this message translates to:
  /// **'Pasos'**
  String get sagaSteps;

  /// No description provided for @sagaStepsEmpty.
  ///
  /// In es, this message translates to:
  /// **'La saga aún no ha ejecutado pasos.'**
  String get sagaStepsEmpty;

  /// No description provided for @sagaErrorCode.
  ///
  /// In es, this message translates to:
  /// **'Código de error'**
  String get sagaErrorCode;

  /// No description provided for @sagaManualActions.
  ///
  /// In es, this message translates to:
  /// **'Acciones manuales'**
  String get sagaManualActions;

  /// No description provided for @sagaIntervention.
  ///
  /// In es, this message translates to:
  /// **'Requiere intervención'**
  String get sagaIntervention;

  /// No description provided for @sagaActionDone.
  ///
  /// In es, this message translates to:
  /// **'Acción registrada en la auditoría.'**
  String get sagaActionDone;

  /// No description provided for @reasonLabel.
  ///
  /// In es, this message translates to:
  /// **'Motivo (obligatorio)'**
  String get reasonLabel;

  /// No description provided for @reasonHelp.
  ///
  /// In es, this message translates to:
  /// **'Explica por qué haces esta acción. Queda registrado en la auditoría.'**
  String get reasonHelp;

  /// No description provided for @sagaStatusRunning.
  ///
  /// In es, this message translates to:
  /// **'En ejecución'**
  String get sagaStatusRunning;

  /// No description provided for @sagaStatusWaitingReply.
  ///
  /// In es, this message translates to:
  /// **'Esperando respuesta'**
  String get sagaStatusWaitingReply;

  /// No description provided for @sagaStatusSuspended.
  ///
  /// In es, this message translates to:
  /// **'Suspendida'**
  String get sagaStatusSuspended;

  /// No description provided for @sagaStatusCompleted.
  ///
  /// In es, this message translates to:
  /// **'Completada'**
  String get sagaStatusCompleted;

  /// No description provided for @sagaStatusCompensating.
  ///
  /// In es, this message translates to:
  /// **'Compensando'**
  String get sagaStatusCompensating;

  /// No description provided for @sagaStatusCompensated.
  ///
  /// In es, this message translates to:
  /// **'Compensada'**
  String get sagaStatusCompensated;

  /// No description provided for @sagaStatusCompensationFailed.
  ///
  /// In es, this message translates to:
  /// **'Compensación fallida'**
  String get sagaStatusCompensationFailed;

  /// No description provided for @sagaStatusRequiresIntervention.
  ///
  /// In es, this message translates to:
  /// **'Requiere intervención'**
  String get sagaStatusRequiresIntervention;

  /// No description provided for @sagaDirectionForward.
  ///
  /// In es, this message translates to:
  /// **'Avance'**
  String get sagaDirectionForward;

  /// No description provided for @sagaDirectionCompensation.
  ///
  /// In es, this message translates to:
  /// **'Compensación'**
  String get sagaDirectionCompensation;

  /// No description provided for @stepStatusDispatched.
  ///
  /// In es, this message translates to:
  /// **'Despachado'**
  String get stepStatusDispatched;

  /// No description provided for @stepStatusSucceeded.
  ///
  /// In es, this message translates to:
  /// **'Correcto'**
  String get stepStatusSucceeded;

  /// No description provided for @stepStatusFailed.
  ///
  /// In es, this message translates to:
  /// **'Fallido'**
  String get stepStatusFailed;

  /// No description provided for @manualActionRetryStep.
  ///
  /// In es, this message translates to:
  /// **'Reintentar paso'**
  String get manualActionRetryStep;

  /// No description provided for @manualActionForceCompensation.
  ///
  /// In es, this message translates to:
  /// **'Forzar compensación'**
  String get manualActionForceCompensation;

  /// No description provided for @manualActionMarkResolved.
  ///
  /// In es, this message translates to:
  /// **'Marcar como resuelta'**
  String get manualActionMarkResolved;

  /// No description provided for @sagaStepLabel.
  ///
  /// In es, this message translates to:
  /// **'{order}. {operation}'**
  String sagaStepLabel(int order, String operation);

  /// No description provided for @dlqTitle.
  ///
  /// In es, this message translates to:
  /// **'Colas muertas'**
  String get dlqTitle;

  /// No description provided for @dlqSubtitle.
  ///
  /// In es, this message translates to:
  /// **'Mensajes que agotaron sus reintentos.'**
  String get dlqSubtitle;

  /// No description provided for @dlqEmpty.
  ///
  /// In es, this message translates to:
  /// **'No hay colas configuradas.'**
  String get dlqEmpty;

  /// No description provided for @dlqMessagesTitle.
  ///
  /// In es, this message translates to:
  /// **'Mensajes'**
  String get dlqMessagesTitle;

  /// No description provided for @dlqSelectQueue.
  ///
  /// In es, this message translates to:
  /// **'Elige una cola para ver sus mensajes.'**
  String get dlqSelectQueue;

  /// No description provided for @dlqMessagesEmpty.
  ///
  /// In es, this message translates to:
  /// **'La cola no tiene mensajes.'**
  String get dlqMessagesEmpty;

  /// No description provided for @dlqMessageType.
  ///
  /// In es, this message translates to:
  /// **'Tipo'**
  String get dlqMessageType;

  /// No description provided for @dlqFirstError.
  ///
  /// In es, this message translates to:
  /// **'Primer error'**
  String get dlqFirstError;

  /// No description provided for @dlqSentAt.
  ///
  /// In es, this message translates to:
  /// **'Enviado'**
  String get dlqSentAt;

  /// No description provided for @dlqRedrive.
  ///
  /// In es, this message translates to:
  /// **'Redistribuir'**
  String get dlqRedrive;

  /// No description provided for @dlqRedriveTitle.
  ///
  /// In es, this message translates to:
  /// **'Redistribuir mensajes'**
  String get dlqRedriveTitle;

  /// No description provided for @dlqMessagesCount.
  ///
  /// In es, this message translates to:
  /// **'{count, plural, =1{1 mensaje} other{{count} mensajes}}'**
  String dlqMessagesCount(int count);

  /// No description provided for @dlqReceiveCount.
  ///
  /// In es, this message translates to:
  /// **'Recepciones: {count}'**
  String dlqReceiveCount(int count);

  /// No description provided for @dlqRedriveConfirm.
  ///
  /// In es, this message translates to:
  /// **'Se moverán {count, plural, =1{1 mensaje} other{{count} mensajes}} de \"{queue}\" a su cola de origen. Revisa el primer error antes de continuar.'**
  String dlqRedriveConfirm(int count, String queue);

  /// No description provided for @dlqRedriveDone.
  ///
  /// In es, this message translates to:
  /// **'{count, plural, =1{1 mensaje redistribuido.} other{{count} mensajes redistribuidos.}}'**
  String dlqRedriveDone(int count);
}

class _BackofficeLocalizationsDelegate
    extends LocalizationsDelegate<BackofficeLocalizations> {
  const _BackofficeLocalizationsDelegate();

  @override
  Future<BackofficeLocalizations> load(Locale locale) {
    return SynchronousFuture<BackofficeLocalizations>(
      lookupBackofficeLocalizations(locale),
    );
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_BackofficeLocalizationsDelegate old) => false;
}

BackofficeLocalizations lookupBackofficeLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return BackofficeLocalizationsEn();
    case 'es':
      return BackofficeLocalizationsEs();
  }

  throw FlutterError(
    'BackofficeLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
