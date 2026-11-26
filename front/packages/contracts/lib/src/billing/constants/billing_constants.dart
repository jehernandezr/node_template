// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

/// `BillingLimits` constants of the `billing` contract.
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

/// `UsageAggregation` constants of the `billing` contract.
abstract final class UsageAggregation {
  static const String users = 'max';
  static const String apiCalls = 'sum';
  static const String storageGb = 'max';
}
