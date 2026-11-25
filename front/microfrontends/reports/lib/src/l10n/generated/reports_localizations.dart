// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'reports_localizations_en.dart';
import 'reports_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of ReportsLocalizations
/// returned by `ReportsLocalizations.of(context)`.
///
/// Applications need to include `ReportsLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/reports_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: ReportsLocalizations.localizationsDelegates,
///   supportedLocales: ReportsLocalizations.supportedLocales,
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
/// be consistent with the languages listed in the ReportsLocalizations.supportedLocales
/// property.
abstract class ReportsLocalizations {
  ReportsLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static ReportsLocalizations of(BuildContext context) {
    return Localizations.of<ReportsLocalizations>(
      context,
      ReportsLocalizations,
    )!;
  }

  static const LocalizationsDelegate<ReportsLocalizations> delegate =
      _ReportsLocalizationsDelegate();

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

  /// Título del catálogo de reportes.
  ///
  /// In es, this message translates to:
  /// **'Reportes'**
  String get catalogTitle;

  /// Título de la lista de ejecuciones y de su acción en el catálogo.
  ///
  /// In es, this message translates to:
  /// **'Ejecuciones'**
  String get runsTitle;

  /// Título de la página de una ejecución.
  ///
  /// In es, this message translates to:
  /// **'Reporte'**
  String get runTitle;

  /// Mensaje cuando falla la carga del catálogo, de las ejecuciones o de una ejecución.
  ///
  /// In es, this message translates to:
  /// **'No se pudieron cargar los reportes.'**
  String get loadError;

  /// Título del catálogo vacío.
  ///
  /// In es, this message translates to:
  /// **'No hay reportes disponibles'**
  String get emptyCatalogTitle;

  /// Texto de apoyo del catálogo vacío.
  ///
  /// In es, this message translates to:
  /// **'Tu plan no incluye reportes por ahora.'**
  String get emptyCatalogMessage;

  /// Título de la lista de ejecuciones vacía.
  ///
  /// In es, this message translates to:
  /// **'Todavía no hay ejecuciones'**
  String get emptyRunsTitle;

  /// Texto de apoyo de la lista de ejecuciones vacía.
  ///
  /// In es, this message translates to:
  /// **'Genera un reporte desde el catálogo y aparecerá aquí.'**
  String get emptyRunsMessage;

  /// Indicación cuando no hay un reporte elegido en el catálogo.
  ///
  /// In es, this message translates to:
  /// **'Elige un reporte para ver sus parámetros.'**
  String get chooseReport;

  /// Etiqueta del rango de días del reporte.
  ///
  /// In es, this message translates to:
  /// **'Periodo'**
  String get periodLabel;

  /// Etiqueta de la agrupación del reporte.
  ///
  /// In es, this message translates to:
  /// **'Agrupar por'**
  String get granularityLabel;

  /// Etiqueta del formato del archivo.
  ///
  /// In es, this message translates to:
  /// **'Formato'**
  String get formatLabel;

  /// Botón que pide una ejecución del reporte elegido.
  ///
  /// In es, this message translates to:
  /// **'Generar reporte'**
  String get generate;

  /// Mensaje cuando falla pedir una ejecución.
  ///
  /// In es, this message translates to:
  /// **'No se pudo generar el reporte.'**
  String get generateError;

  /// Botón que descarga el resultado de una ejecución lista.
  ///
  /// In es, this message translates to:
  /// **'Descargar'**
  String get download;

  /// Aviso cuando el navegador guardó el archivo.
  ///
  /// In es, this message translates to:
  /// **'Se descargó {fileName}.'**
  String downloaded(String fileName);

  /// Aviso cuando el contenido del archivo quedó en el portapapeles.
  ///
  /// In es, this message translates to:
  /// **'Se copió {fileName} al portapapeles.'**
  String copied(String fileName);

  /// Mensaje cuando falla la descarga.
  ///
  /// In es, this message translates to:
  /// **'No se pudo descargar el reporte.'**
  String get downloadError;

  /// Aviso mientras la ejecución está en cola o en curso.
  ///
  /// In es, this message translates to:
  /// **'El reporte se está generando. Esta página se actualiza sola.'**
  String get runPending;

  /// Aviso de una ejecución fallida.
  ///
  /// In es, this message translates to:
  /// **'El reporte no se pudo generar. Pide uno nuevo desde el catálogo.'**
  String get runFailed;

  /// Aviso de una ejecución vencida.
  ///
  /// In es, this message translates to:
  /// **'El resultado de este reporte venció. Pide uno nuevo desde el catálogo.'**
  String get runExpired;

  /// Mensaje cuando la ejecución pedida no existe.
  ///
  /// In es, this message translates to:
  /// **'Ese reporte no existe.'**
  String get runNotFound;

  /// Texto cuando el resultado está vacío.
  ///
  /// In es, this message translates to:
  /// **'El reporte no tiene filas en ese periodo.'**
  String get noRows;

  /// Rango de fechas de una ejecución.
  ///
  /// In es, this message translates to:
  /// **'Del {from} al {to}'**
  String runRange(String from, String to);

  /// Fecha en que se pidió la ejecución.
  ///
  /// In es, this message translates to:
  /// **'Pedido el {date}'**
  String requestedAt(String date);

  /// Nombre de un tipo de reporte.
  ///
  /// In es, this message translates to:
  /// **'Tareas por estado'**
  String get typeTasksByStatus;

  /// Nombre de un tipo de reporte.
  ///
  /// In es, this message translates to:
  /// **'Actividad de tareas'**
  String get typeTasksActivity;

  /// Nombre de un tipo de reporte.
  ///
  /// In es, this message translates to:
  /// **'Resumen de facturas'**
  String get typeInvoicesSummary;

  /// Nombre de un tipo de reporte.
  ///
  /// In es, this message translates to:
  /// **'Entrega de notificaciones'**
  String get typeNotificationsDelivery;

  /// Estado de una ejecución.
  ///
  /// In es, this message translates to:
  /// **'En cola'**
  String get statusQueued;

  /// Estado de una ejecución.
  ///
  /// In es, this message translates to:
  /// **'Generando'**
  String get statusRunning;

  /// Estado de una ejecución.
  ///
  /// In es, this message translates to:
  /// **'Listo'**
  String get statusReady;

  /// Estado de una ejecución.
  ///
  /// In es, this message translates to:
  /// **'Falló'**
  String get statusFailed;

  /// Estado de una ejecución.
  ///
  /// In es, this message translates to:
  /// **'Vencido'**
  String get statusExpired;

  /// Formato de archivo.
  ///
  /// In es, this message translates to:
  /// **'JSON'**
  String get formatJson;

  /// Formato de archivo.
  ///
  /// In es, this message translates to:
  /// **'CSV'**
  String get formatCsv;

  /// Agrupación del reporte.
  ///
  /// In es, this message translates to:
  /// **'Día'**
  String get granularityDay;

  /// Agrupación del reporte.
  ///
  /// In es, this message translates to:
  /// **'Semana'**
  String get granularityWeek;

  /// Agrupación del reporte.
  ///
  /// In es, this message translates to:
  /// **'Mes'**
  String get granularityMonth;

  /// Rango de días del reporte.
  ///
  /// In es, this message translates to:
  /// **'7 días'**
  String get periodLast7Days;

  /// Rango de días del reporte.
  ///
  /// In es, this message translates to:
  /// **'30 días'**
  String get periodLast30Days;

  /// Rango de días del reporte.
  ///
  /// In es, this message translates to:
  /// **'90 días'**
  String get periodLast90Days;

  /// Parámetros de una ejecución: rango, agrupación y formato.
  ///
  /// In es, this message translates to:
  /// **'{range}, agrupado por {granularity}, en {format}'**
  String runSummary(String range, String granularity, String format);
}

class _ReportsLocalizationsDelegate
    extends LocalizationsDelegate<ReportsLocalizations> {
  const _ReportsLocalizationsDelegate();

  @override
  Future<ReportsLocalizations> load(Locale locale) {
    return SynchronousFuture<ReportsLocalizations>(
      lookupReportsLocalizations(locale),
    );
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_ReportsLocalizationsDelegate old) => false;
}

ReportsLocalizations lookupReportsLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return ReportsLocalizationsEn();
    case 'es':
      return ReportsLocalizationsEs();
  }

  throw FlutterError(
    'ReportsLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
