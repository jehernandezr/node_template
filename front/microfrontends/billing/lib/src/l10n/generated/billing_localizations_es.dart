// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'billing_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class BillingLocalizationsEs extends BillingLocalizations {
  BillingLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get billingPageTitle => 'Facturación';

  @override
  String get invoicesTitle => 'Facturas';

  @override
  String get invoiceTitle => 'Factura';

  @override
  String get currentPlan => 'Plan actual';

  @override
  String get subscriptionStatus => 'Estado de la suscripción';

  @override
  String get currentPeriod => 'Periodo actual';

  @override
  String get usageTitle => 'Uso del periodo';

  @override
  String get quotaUsers => 'Usuarios';

  @override
  String get quotaApiCalls => 'Llamadas API';

  @override
  String get quotaStorageGb => 'Almacenamiento (GB)';

  @override
  String get noQuotas => 'Este plan no tiene cuotas medidas.';

  @override
  String get changePlan => 'Cambiar plan';

  @override
  String get changePlanTitle => 'Cambiar de plan';

  @override
  String get availablePlans => 'Planes disponibles';

  @override
  String get currentPlanBadge => 'Actual';

  @override
  String get prorationNote =>
      'Al confirmar, el cambio se prorratea según los días que restan del periodo: el nuevo plan aplica desde hoy y la diferencia se ajusta en la próxima factura.';

  @override
  String get confirmChange => 'Confirmar cambio';

  @override
  String get changePlanError => 'No pudimos cambiar el plan.';

  @override
  String get viewInvoices => 'Ver facturas';

  @override
  String get invoicePeriod => 'Periodo';

  @override
  String get charges => 'Cargos';

  @override
  String get total => 'Total';

  @override
  String get fixedFee => 'Cargo fijo';

  @override
  String get usageCharge => 'Uso medido';

  @override
  String get download => 'Descargar';

  @override
  String get downloadPending =>
      'La descarga de facturas estará disponible próximamente.';

  @override
  String get noInvoicesTitle => 'Aún no hay facturas';

  @override
  String get noInvoicesMessage =>
      'Las facturas aparecerán al cerrar cada periodo.';

  @override
  String get invoiceNotFound => 'No encontramos esta factura.';

  @override
  String get loadError => 'No pudimos cargar la facturación.';

  @override
  String get monthly => 'Mensual';

  @override
  String get annual => 'Anual';

  @override
  String get subscriptionTrialing => 'En prueba';

  @override
  String get subscriptionActive => 'Activa';

  @override
  String get subscriptionPastDue => 'Pago pendiente';

  @override
  String get subscriptionSuspended => 'Suspendida';

  @override
  String get subscriptionCanceled => 'Cancelada';

  @override
  String get invoiceDraft => 'Borrador';

  @override
  String get invoiceIssued => 'Emitida';

  @override
  String get invoicePaid => 'Pagada';

  @override
  String get invoiceFailed => 'Fallida';

  @override
  String get invoiceVoided => 'Anulada';

  @override
  String periodRange(String start, String end) {
    return '$start a $end';
  }
}
