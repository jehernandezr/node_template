// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import 'package:meta/meta.dart';

import '../../core/core.dart';

/// Parámetros de paginación por cursor.
@immutable
final class PageQuery {
  const PageQuery({this.limit, this.after});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory PageQuery.fromJson(Map<String, dynamic> json) {
    try {
      return PageQuery(
        limit: json['limit'] == null ? null : (json['limit'] as num).toInt(),
        after: json['after'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PageQuery: $error', json);
    }
  }

  final int? limit;

  final String? after;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'limit': ?limit,
    'after': ?after,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(PageQuery value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PageQuery &&
          contractEquals(limit, other.limit) &&
          contractEquals(after, other.after);

  @override
  int get hashCode => contractHash([limit, after]);
}

/// Monto en unidades menores de la moneda.
@immutable
final class MoneyAmount {
  const MoneyAmount({required this.amountMinor, required this.currency});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory MoneyAmount.fromJson(Map<String, dynamic> json) {
    try {
      return MoneyAmount(
        amountMinor: (json['amountMinor'] as num).toInt(),
        currency: json['currency'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MoneyAmount: $error', json);
    }
  }

  final int amountMinor;

  final String currency;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'amountMinor': amountMinor,
    'currency': currency,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(MoneyAmount value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MoneyAmount &&
          contractEquals(amountMinor, other.amountMinor) &&
          contractEquals(currency, other.currency);

  @override
  int get hashCode => contractHash([amountMinor, currency]);
}

/// Petición sin campos.
@immutable
final class Empty {
  const Empty();

  /// Lee el objeto desde JSON. No tiene campos.
  factory Empty.fromJson(Map<String, dynamic> json) => const Empty();

  /// JSON del objeto: siempre vacío.
  Map<String, dynamic> toJson() => <String, dynamic>{};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(Empty value) => value.toJson();

  @override
  bool operator ==(Object other) => other is Empty;

  @override
  int get hashCode => contractHash(const []);
}
