// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

/// `Pagination` constants of the `platform` contract.
abstract final class Pagination {
  static const int defaultLimit = 20;
  static const int maxLimit = 100;
  static const int maxCursorLength = 512;
  static const String cursorPattern = '^[A-Za-z0-9_-]+\$';
}

/// `MoneyLimits` constants of the `platform` contract.
abstract final class MoneyLimits {
  static const int maxAbsAmountMinor = 9007199254740991;
  static const String currencyPattern = '^[A-Z]{3}\$';
}

/// `IdentifierFormat` constants of the `platform` contract.
abstract final class IdentifierFormat {
  static const int version = 7;
  static const String pattern =
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\$';
}

/// `ValidationRules` constants of the `platform` contract.
abstract final class ValidationRules {
  static const String fieldPathSeparator = '.';
  static const String messageKeyPrefix = 'error_';
}

/// `CalendarDateFormat` constants of the `platform` contract.
abstract final class CalendarDateFormat {
  static const String pattern = '^\\d{4}-\\d{2}-\\d{2}\$';
}

/// `TenantMoveLimits` constants of the `platform` contract.
abstract final class TenantMoveLimits {
  static const int targetMaxLength = 64;
  static const int tableNameMaxLength = 63;
  static const int maxTables = 64;
  static const int checksumMaxLength = 64;
  static const int syncTimeoutMs = 6000;
  static const int finalizeTimeoutMs = 6000;
  static const int abortTimeoutMs = 6000;
  static const int switchTimeoutMs = 6000;
  static const int cleanupTimeoutMs = 6000;
}

/// `TenantDirectoryLimits` constants of the `platform` contract.
abstract final class TenantDirectoryLimits {
  static const int fieldMaxLength = 64;
  static const int maxGroups = 64;
  static const int placeTimeoutMs = 5000;
  static const int removeTimeoutMs = 5000;
}
