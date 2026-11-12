// ignore_for_file: deprecated_member_use
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'tasks_localizations_en.dart';
import 'tasks_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of TasksLocalizations
/// returned by `TasksLocalizations.of(context)`.
///
/// Applications need to include `TasksLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/tasks_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: TasksLocalizations.localizationsDelegates,
///   supportedLocales: TasksLocalizations.supportedLocales,
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
/// be consistent with the languages listed in the TasksLocalizations.supportedLocales
/// property.
abstract class TasksLocalizations {
  TasksLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static TasksLocalizations of(BuildContext context) {
    return Localizations.of<TasksLocalizations>(context, TasksLocalizations)!;
  }

  static const LocalizationsDelegate<TasksLocalizations> delegate =
      _TasksLocalizationsDelegate();

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

  /// No description provided for @screenTitle.
  ///
  /// In es, this message translates to:
  /// **'Tareas'**
  String get screenTitle;

  /// No description provided for @newTask.
  ///
  /// In es, this message translates to:
  /// **'Nueva tarea'**
  String get newTask;

  /// No description provided for @editTaskTitle.
  ///
  /// In es, this message translates to:
  /// **'Editar tarea'**
  String get editTaskTitle;

  /// No description provided for @detailTitle.
  ///
  /// In es, this message translates to:
  /// **'Tarea'**
  String get detailTitle;

  /// No description provided for @filterAll.
  ///
  /// In es, this message translates to:
  /// **'Todas'**
  String get filterAll;

  /// No description provided for @filterOpen.
  ///
  /// In es, this message translates to:
  /// **'Abiertas'**
  String get filterOpen;

  /// No description provided for @filterInProgress.
  ///
  /// In es, this message translates to:
  /// **'En progreso'**
  String get filterInProgress;

  /// No description provided for @filterDone.
  ///
  /// In es, this message translates to:
  /// **'Hechas'**
  String get filterDone;

  /// No description provided for @statusOpen.
  ///
  /// In es, this message translates to:
  /// **'Abierta'**
  String get statusOpen;

  /// No description provided for @statusInProgress.
  ///
  /// In es, this message translates to:
  /// **'En progreso'**
  String get statusInProgress;

  /// No description provided for @statusDone.
  ///
  /// In es, this message translates to:
  /// **'Hecha'**
  String get statusDone;

  /// No description provided for @searchHint.
  ///
  /// In es, this message translates to:
  /// **'Buscar por título o descripción'**
  String get searchHint;

  /// No description provided for @emptyTitle.
  ///
  /// In es, this message translates to:
  /// **'No hay tareas'**
  String get emptyTitle;

  /// No description provided for @emptyMessage.
  ///
  /// In es, this message translates to:
  /// **'Crea una tarea para empezar.'**
  String get emptyMessage;

  /// No description provided for @emptySearchTitle.
  ///
  /// In es, this message translates to:
  /// **'Sin resultados'**
  String get emptySearchTitle;

  /// No description provided for @emptySearchMessage.
  ///
  /// In es, this message translates to:
  /// **'Prueba con otro texto.'**
  String get emptySearchMessage;

  /// No description provided for @selectTask.
  ///
  /// In es, this message translates to:
  /// **'Selecciona una tarea para verla aquí.'**
  String get selectTask;

  /// No description provided for @loadError.
  ///
  /// In es, this message translates to:
  /// **'No se pudieron cargar las tareas.'**
  String get loadError;

  /// No description provided for @detailError.
  ///
  /// In es, this message translates to:
  /// **'No se pudo cargar la tarea.'**
  String get detailError;

  /// No description provided for @detailNotFound.
  ///
  /// In es, this message translates to:
  /// **'La tarea no existe.'**
  String get detailNotFound;

  /// No description provided for @saveError.
  ///
  /// In es, this message translates to:
  /// **'No se pudo guardar la tarea.'**
  String get saveError;

  /// No description provided for @deleteError.
  ///
  /// In es, this message translates to:
  /// **'No se pudo eliminar la tarea.'**
  String get deleteError;

  /// No description provided for @titleLabel.
  ///
  /// In es, this message translates to:
  /// **'Título'**
  String get titleLabel;

  /// No description provided for @titleRequired.
  ///
  /// In es, this message translates to:
  /// **'Escribe un título.'**
  String get titleRequired;

  /// No description provided for @descriptionLabel.
  ///
  /// In es, this message translates to:
  /// **'Descripción'**
  String get descriptionLabel;

  /// No description provided for @statusLabel.
  ///
  /// In es, this message translates to:
  /// **'Estado'**
  String get statusLabel;

  /// No description provided for @noDescription.
  ///
  /// In es, this message translates to:
  /// **'Sin descripción'**
  String get noDescription;

  /// No description provided for @deleteTitle.
  ///
  /// In es, this message translates to:
  /// **'¿Eliminar tarea?'**
  String get deleteTitle;

  /// No description provided for @deleteMessage.
  ///
  /// In es, this message translates to:
  /// **'Esta acción no se puede deshacer.'**
  String get deleteMessage;
}

class _TasksLocalizationsDelegate
    extends LocalizationsDelegate<TasksLocalizations> {
  const _TasksLocalizationsDelegate();

  @override
  Future<TasksLocalizations> load(Locale locale) {
    return SynchronousFuture<TasksLocalizations>(
      lookupTasksLocalizations(locale),
    );
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_TasksLocalizationsDelegate old) => false;
}

TasksLocalizations lookupTasksLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return TasksLocalizationsEn();
    case 'es':
      return TasksLocalizationsEs();
  }

  throw FlutterError(
    'TasksLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
