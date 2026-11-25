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

/// Referencia a un usuario con su tenant de origen.
@immutable
final class UserRef {
  const UserRef({required this.userId, required this.homeTenantId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory UserRef.fromJson(Map<String, dynamic> json) {
    try {
      return UserRef(
        userId: json['userId'] as String,
        homeTenantId: json['homeTenantId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserRef: $error', json);
    }
  }

  final String userId;

  final String homeTenantId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'homeTenantId': homeTenantId,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(UserRef value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserRef &&
          contractEquals(userId, other.userId) &&
          contractEquals(homeTenantId, other.homeTenantId);

  @override
  int get hashCode => contractHash([userId, homeTenantId]);
}

/// Traslado de un tenant a otro grupo de shards o región.
@immutable
final class TenantMoveRef {
  const TenantMoveRef({
    required this.moveId,
    required this.tenantId,
    required this.targetGroup,
    required this.targetRegion,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantMoveRef.fromJson(Map<String, dynamic> json) {
    try {
      return TenantMoveRef(
        moveId: json['moveId'] as String,
        tenantId: json['tenantId'] as String,
        targetGroup: json['targetGroup'] as String,
        targetRegion: json['targetRegion'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantMoveRef: $error', json);
    }
  }

  final String moveId;

  final String tenantId;

  final String targetGroup;

  final String targetRegion;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'moveId': moveId,
    'tenantId': tenantId,
    'targetGroup': targetGroup,
    'targetRegion': targetRegion,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantMoveRef value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantMoveRef &&
          contractEquals(moveId, other.moveId) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(targetGroup, other.targetGroup) &&
          contractEquals(targetRegion, other.targetRegion);

  @override
  int get hashCode =>
      contractHash([moveId, tenantId, targetGroup, targetRegion]);
}

/// Avance de la copia de una tabla.
@immutable
final class TenantMoveTableProgress {
  const TenantMoveTableProgress({
    required this.table,
    required this.copiedRows,
    required this.pendingRows,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantMoveTableProgress.fromJson(Map<String, dynamic> json) {
    try {
      return TenantMoveTableProgress(
        table: json['table'] as String,
        copiedRows: (json['copiedRows'] as num).toInt(),
        pendingRows: (json['pendingRows'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantMoveTableProgress: $error', json);
    }
  }

  final String table;

  final int copiedRows;

  final int pendingRows;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'table': table,
    'copiedRows': copiedRows,
    'pendingRows': pendingRows,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantMoveTableProgress value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantMoveTableProgress &&
          contractEquals(table, other.table) &&
          contractEquals(copiedRows, other.copiedRows) &&
          contractEquals(pendingRows, other.pendingRows);

  @override
  int get hashCode => contractHash([table, copiedRows, pendingRows]);
}

/// Resultado de una ronda de copia.
@immutable
final class TenantMoveProgress {
  const TenantMoveProgress({required this.tables, required this.caughtUp});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantMoveProgress.fromJson(Map<String, dynamic> json) {
    try {
      return TenantMoveProgress(
        tables: [
          for (final e0 in json['tables'] as List<dynamic>)
            TenantMoveTableProgress.fromJson(e0 as Map<String, dynamic>),
        ],
        caughtUp: json['caughtUp'] as bool,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantMoveProgress: $error', json);
    }
  }

  final List<TenantMoveTableProgress> tables;

  final bool caughtUp;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tables': [for (final e0 in tables) e0.toJson()],
    'caughtUp': caughtUp,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantMoveProgress value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantMoveProgress &&
          contractEquals(tables, other.tables) &&
          contractEquals(caughtUp, other.caughtUp);

  @override
  int get hashCode => contractHash([tables, caughtUp]);
}

/// Conteo y suma de verificación de una tabla en el origen y el destino.
@immutable
final class TenantMoveTableCheck {
  const TenantMoveTableCheck({
    required this.table,
    required this.sourceRows,
    required this.targetRows,
    required this.sourceChecksum,
    required this.targetChecksum,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantMoveTableCheck.fromJson(Map<String, dynamic> json) {
    try {
      return TenantMoveTableCheck(
        table: json['table'] as String,
        sourceRows: (json['sourceRows'] as num).toInt(),
        targetRows: (json['targetRows'] as num).toInt(),
        sourceChecksum: json['sourceChecksum'] as String,
        targetChecksum: json['targetChecksum'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantMoveTableCheck: $error', json);
    }
  }

  final String table;

  final int sourceRows;

  final int targetRows;

  final String sourceChecksum;

  final String targetChecksum;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'table': table,
    'sourceRows': sourceRows,
    'targetRows': targetRows,
    'sourceChecksum': sourceChecksum,
    'targetChecksum': targetChecksum,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantMoveTableCheck value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantMoveTableCheck &&
          contractEquals(table, other.table) &&
          contractEquals(sourceRows, other.sourceRows) &&
          contractEquals(targetRows, other.targetRows) &&
          contractEquals(sourceChecksum, other.sourceChecksum) &&
          contractEquals(targetChecksum, other.targetChecksum);

  @override
  int get hashCode => contractHash([
    table,
    sourceRows,
    targetRows,
    sourceChecksum,
    targetChecksum,
  ]);
}

/// Resultado de la última ronda y de la verificación de un traslado.
@immutable
final class TenantMoveVerification {
  const TenantMoveVerification({required this.verified, required this.tables});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantMoveVerification.fromJson(Map<String, dynamic> json) {
    try {
      return TenantMoveVerification(
        verified: json['verified'] as bool,
        tables: [
          for (final e0 in json['tables'] as List<dynamic>)
            TenantMoveTableCheck.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantMoveVerification: $error', json);
    }
  }

  final bool verified;

  final List<TenantMoveTableCheck> tables;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'verified': verified,
    'tables': [for (final e0 in tables) e0.toJson()],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantMoveVerification value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantMoveVerification &&
          contractEquals(verified, other.verified) &&
          contractEquals(tables, other.tables);

  @override
  int get hashCode => contractHash([verified, tables]);
}

/// Acuse de una cancelación o una limpieza de traslado.
@immutable
final class TenantMoveAck {
  const TenantMoveAck({required this.moveId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantMoveAck.fromJson(Map<String, dynamic> json) {
    try {
      return TenantMoveAck(moveId: json['moveId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantMoveAck: $error', json);
    }
  }

  final String moveId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'moveId': moveId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantMoveAck value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantMoveAck && contractEquals(moveId, other.moveId);

  @override
  int get hashCode => contractHash([moveId]);
}

/// Ubicación de un tenant que cada servicio anota en su directorio de shards.
@immutable
final class TenantDirectoryEntry {
  const TenantDirectoryEntry({
    required this.tenantId,
    required this.region,
    required this.groups,
    required this.dedicated,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantDirectoryEntry.fromJson(Map<String, dynamic> json) {
    try {
      return TenantDirectoryEntry(
        tenantId: json['tenantId'] as String,
        region: json['region'] as String,
        groups: [
          for (final e0 in json['groups'] as List<dynamic>) e0 as String,
        ],
        dedicated: json['dedicated'] as bool,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantDirectoryEntry: $error', json);
    }
  }

  final String tenantId;

  final String region;

  final List<String> groups;

  final bool dedicated;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'region': region,
    'groups': groups,
    'dedicated': dedicated,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantDirectoryEntry value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantDirectoryEntry &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(region, other.region) &&
          contractEquals(groups, other.groups) &&
          contractEquals(dedicated, other.dedicated);

  @override
  int get hashCode => contractHash([tenantId, region, groups, dedicated]);
}

/// Tenant cuya fila se retira del directorio de un servicio.
@immutable
final class TenantDirectoryRef {
  const TenantDirectoryRef({required this.tenantId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantDirectoryRef.fromJson(Map<String, dynamic> json) {
    try {
      return TenantDirectoryRef(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantDirectoryRef: $error', json);
    }
  }

  final String tenantId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantDirectoryRef value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantDirectoryRef && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Acuse de la ubicación o del retiro de un tenant en el directorio de un servicio.
@immutable
final class TenantDirectoryAck {
  const TenantDirectoryAck({required this.tenantId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TenantDirectoryAck.fromJson(Map<String, dynamic> json) {
    try {
      return TenantDirectoryAck(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantDirectoryAck: $error', json);
    }
  }

  final String tenantId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TenantDirectoryAck value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantDirectoryAck && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Datos públicos del error, por ejemplo la URL de la región del tenant.
@immutable
final class ProblemDetailsDetails {
  const ProblemDetailsDetails({this.apiBaseUrl, this.region});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory ProblemDetailsDetails.fromJson(Map<String, dynamic> json) {
    try {
      return ProblemDetailsDetails(
        apiBaseUrl: json['apiBaseUrl'] as String?,
        region: json['region'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ProblemDetailsDetails: $error', json);
    }
  }

  final String? apiBaseUrl;

  final String? region;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'apiBaseUrl': ?apiBaseUrl,
    'region': ?region,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(ProblemDetailsDetails value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProblemDetailsDetails &&
          contractEquals(apiBaseUrl, other.apiBaseUrl) &&
          contractEquals(region, other.region);

  @override
  int get hashCode => contractHash([apiBaseUrl, region]);
}
