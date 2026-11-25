// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'reports_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class ReportsLocalizationsEs extends ReportsLocalizations {
  ReportsLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get catalogTitle => 'Reportes';

  @override
  String get runsTitle => 'Ejecuciones';

  @override
  String get runTitle => 'Reporte';

  @override
  String get loadError => 'No se pudieron cargar los reportes.';

  @override
  String get emptyCatalogTitle => 'No hay reportes disponibles';

  @override
  String get emptyCatalogMessage => 'Tu plan no incluye reportes por ahora.';

  @override
  String get emptyRunsTitle => 'Todavía no hay ejecuciones';

  @override
  String get emptyRunsMessage =>
      'Genera un reporte desde el catálogo y aparecerá aquí.';

  @override
  String get chooseReport => 'Elige un reporte para ver sus parámetros.';

  @override
  String get periodLabel => 'Periodo';

  @override
  String get granularityLabel => 'Agrupar por';

  @override
  String get formatLabel => 'Formato';

  @override
  String get generate => 'Generar reporte';

  @override
  String get generateError => 'No se pudo generar el reporte.';

  @override
  String get download => 'Descargar';

  @override
  String downloaded(String fileName) {
    return 'Se descargó $fileName.';
  }

  @override
  String copied(String fileName) {
    return 'Se copió $fileName al portapapeles.';
  }

  @override
  String get downloadError => 'No se pudo descargar el reporte.';

  @override
  String get runPending =>
      'El reporte se está generando. Esta página se actualiza sola.';

  @override
  String get runFailed =>
      'El reporte no se pudo generar. Pide uno nuevo desde el catálogo.';

  @override
  String get runExpired =>
      'El resultado de este reporte venció. Pide uno nuevo desde el catálogo.';

  @override
  String get runNotFound => 'Ese reporte no existe.';

  @override
  String get noRows => 'El reporte no tiene filas en ese periodo.';

  @override
  String runRange(String from, String to) {
    return 'Del $from al $to';
  }

  @override
  String requestedAt(String date) {
    return 'Pedido el $date';
  }

  @override
  String get typeTasksByStatus => 'Tareas por estado';

  @override
  String get typeTasksActivity => 'Actividad de tareas';

  @override
  String get typeInvoicesSummary => 'Resumen de facturas';

  @override
  String get typeNotificationsDelivery => 'Entrega de notificaciones';

  @override
  String get statusQueued => 'En cola';

  @override
  String get statusRunning => 'Generando';

  @override
  String get statusReady => 'Listo';

  @override
  String get statusFailed => 'Falló';

  @override
  String get statusExpired => 'Vencido';

  @override
  String get formatJson => 'JSON';

  @override
  String get formatCsv => 'CSV';

  @override
  String get granularityDay => 'Día';

  @override
  String get granularityWeek => 'Semana';

  @override
  String get granularityMonth => 'Mes';

  @override
  String get periodLast7Days => '7 días';

  @override
  String get periodLast30Days => '30 días';

  @override
  String get periodLast90Days => '90 días';

  @override
  String runSummary(String range, String granularity, String format) {
    return '$range, agrupado por $granularity, en $format';
  }
}
