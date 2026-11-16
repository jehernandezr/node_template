// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Constantes `BillingLimits` del contrato `billing`.
abstract final class BillingLimits {
  static const int planNameMaxLength = 120;
  static const int invoiceNumberMaxLength = 32;
  static const int invoiceDescriptionMaxLength = 200;
  static const int maxQuotasPerPlan = 10;
  static const int maxFeaturesPerPlan = 20;
  static const int maxLinesPerInvoice = 200;
  static const int usageKeyMaxLength = 200;
  static const int maxUsageRecordsPerBatch = 500;
  static const int maxUsageQuantity = 1000000000;
  static const int maxPlans = 20;
  static const int paymentReferenceMaxLength = 120;
  static const int failureReasonMaxLength = 200;
}

/// Constantes `UsageAggregation` del contrato `billing`.
abstract final class UsageAggregation {
  static const String users = 'max';
  static const String apiCalls = 'sum';
  static const String storageGb = 'max';
}
