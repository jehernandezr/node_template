// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'billing_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class BillingLocalizationsEn extends BillingLocalizations {
  BillingLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get billingPageTitle => 'Billing';

  @override
  String get invoicesTitle => 'Invoices';

  @override
  String get invoiceTitle => 'Invoice';

  @override
  String get currentPlan => 'Current plan';

  @override
  String get subscriptionStatus => 'Subscription status';

  @override
  String get currentPeriod => 'Current period';

  @override
  String get usageTitle => 'Usage this period';

  @override
  String get noQuotas => 'This plan has no metered quotas.';

  @override
  String get changePlan => 'Change plan';

  @override
  String get changePlanTitle => 'Change plan';

  @override
  String get availablePlans => 'Available plans';

  @override
  String get currentPlanBadge => 'Current';

  @override
  String get prorationNote =>
      'When you confirm, the change is prorated by the days left in the period: the new plan applies from today and the difference is adjusted on the next invoice.';

  @override
  String get confirmChange => 'Confirm change';

  @override
  String get changePlanError => 'We could not change your plan.';

  @override
  String get viewInvoices => 'View invoices';

  @override
  String get invoicePeriod => 'Period';

  @override
  String get charges => 'Charges';

  @override
  String get total => 'Total';

  @override
  String get fixedFee => 'Fixed fee';

  @override
  String get usageCharge => 'Metered usage';

  @override
  String get download => 'Download';

  @override
  String get downloadPending => 'Invoice downloads will be available soon.';

  @override
  String get noInvoicesTitle => 'No invoices yet';

  @override
  String get noInvoicesMessage => 'Invoices appear when each period closes.';

  @override
  String get invoiceNotFound => 'We could not find this invoice.';

  @override
  String get loadError => 'We could not load billing.';

  @override
  String get monthly => 'Monthly';

  @override
  String get annual => 'Annual';

  @override
  String get subscriptionTrialing => 'Trial';

  @override
  String get subscriptionActive => 'Active';

  @override
  String get subscriptionPastDue => 'Payment due';

  @override
  String get subscriptionSuspended => 'Suspended';

  @override
  String get subscriptionCanceled => 'Canceled';

  @override
  String get invoiceDraft => 'Draft';

  @override
  String get invoiceIssued => 'Issued';

  @override
  String get invoicePaid => 'Paid';

  @override
  String get invoiceFailed => 'Failed';

  @override
  String get invoiceVoided => 'Voided';

  @override
  String periodRange(String start, String end) {
    return '$start - $end';
  }

  @override
  String get monthJan => 'Jan';

  @override
  String get monthFeb => 'Feb';

  @override
  String get monthMar => 'Mar';

  @override
  String get monthApr => 'Apr';

  @override
  String get monthMay => 'May';

  @override
  String get monthJun => 'Jun';

  @override
  String get monthJul => 'Jul';

  @override
  String get monthAug => 'Aug';

  @override
  String get monthSep => 'Sep';

  @override
  String get monthOct => 'Oct';

  @override
  String get monthNov => 'Nov';

  @override
  String get monthDec => 'Dec';
}
