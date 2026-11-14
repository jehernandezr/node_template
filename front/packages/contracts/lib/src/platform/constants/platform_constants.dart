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
