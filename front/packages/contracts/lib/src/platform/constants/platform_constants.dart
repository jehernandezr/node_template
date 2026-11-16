// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Constantes `Pagination` del contrato `platform`.
abstract final class Pagination {
  static const int defaultLimit = 20;
  static const int maxLimit = 100;
  static const int maxCursorLength = 512;
  static const String cursorPattern = '^[A-Za-z0-9_-]+\$';
}

/// Constantes `MoneyLimits` del contrato `platform`.
abstract final class MoneyLimits {
  static const int maxAbsAmountMinor = 9007199254740991;
  static const String currencyPattern = '^[A-Z]{3}\$';
}

/// Constantes `IdentifierFormat` del contrato `platform`.
abstract final class IdentifierFormat {
  static const int version = 7;
  static const String pattern =
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\$';
}

/// Constantes `ValidationRules` del contrato `platform`.
abstract final class ValidationRules {
  static const String fieldPathSeparator = '.';
  static const String messageKeyPrefix = 'error_';
}

/// Constantes `CalendarDateFormat` del contrato `platform`.
abstract final class CalendarDateFormat {
  static const String pattern = '^\\d{4}-\\d{2}-\\d{2}\$';
}

/// Constantes `TenantMoveLimits` del contrato `platform`.
abstract final class TenantMoveLimits {
  static const int targetMaxLength = 64;
  static const int tableNameMaxLength = 63;
  static const int maxTables = 64;
  static const int checksumMaxLength = 64;
  static const int syncTimeoutMs = 6000;
  static const int finalizeTimeoutMs = 6000;
  static const int abortTimeoutMs = 6000;
  static const int cleanupTimeoutMs = 6000;
}
