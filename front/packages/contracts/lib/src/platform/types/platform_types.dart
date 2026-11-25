// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

import 'package:meta/meta.dart';

import '../../core/core.dart';

/// Cursor pagination parameters.
@immutable
final class PageQuery {
  const PageQuery({this.limit, this.after});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'limit': ?limit,
    'after': ?after,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Amount in minor units of the currency.
@immutable
final class MoneyAmount {
  const MoneyAmount({required this.amountMinor, required this.currency});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'amountMinor': amountMinor,
    'currency': currency,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Request without fields.
@immutable
final class Empty {
  const Empty();

  /// Reads the object from JSON. It has no fields.
  factory Empty.fromJson(Map<String, dynamic> json) => const Empty();

  /// JSON of the object: always empty.
  Map<String, dynamic> toJson() => <String, dynamic>{};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(Empty value) => value.toJson();

  @override
  bool operator ==(Object other) => other is Empty;

  @override
  int get hashCode => contractHash(const []);
}

/// Reference to a user with their home tenant.
@immutable
final class UserRef {
  const UserRef({required this.userId, required this.homeTenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'homeTenantId': homeTenantId,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Move of a tenant to another shard group or region.
@immutable
final class TenantMoveRef {
  const TenantMoveRef({
    required this.moveId,
    required this.tenantId,
    required this.targetGroup,
    required this.targetRegion,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'moveId': moveId,
    'tenantId': tenantId,
    'targetGroup': targetGroup,
    'targetRegion': targetRegion,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Copy progress of a table.
@immutable
final class TenantMoveTableProgress {
  const TenantMoveTableProgress({
    required this.table,
    required this.copiedRows,
    required this.pendingRows,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'table': table,
    'copiedRows': copiedRows,
    'pendingRows': pendingRows,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Result of a copy round.
@immutable
final class TenantMoveProgress {
  const TenantMoveProgress({required this.tables, required this.caughtUp});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tables': [for (final e0 in tables) e0.toJson()],
    'caughtUp': caughtUp,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Count and checksum of a table in the source and the target.
@immutable
final class TenantMoveTableCheck {
  const TenantMoveTableCheck({
    required this.table,
    required this.sourceRows,
    required this.targetRows,
    required this.sourceChecksum,
    required this.targetChecksum,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'table': table,
    'sourceRows': sourceRows,
    'targetRows': targetRows,
    'sourceChecksum': sourceChecksum,
    'targetChecksum': targetChecksum,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Result of the last round and the verification of a move.
@immutable
final class TenantMoveVerification {
  const TenantMoveVerification({required this.verified, required this.tables});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'verified': verified,
    'tables': [for (final e0 in tables) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Acknowledgement of a move cancellation or cleanup.
@immutable
final class TenantMoveAck {
  const TenantMoveAck({required this.moveId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantMoveAck.fromJson(Map<String, dynamic> json) {
    try {
      return TenantMoveAck(moveId: json['moveId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantMoveAck: $error', json);
    }
  }

  final String moveId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'moveId': moveId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantMoveAck value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantMoveAck && contractEquals(moveId, other.moveId);

  @override
  int get hashCode => contractHash([moveId]);
}

/// Location of a tenant that each service records in its shard directory.
@immutable
final class TenantDirectoryEntry {
  const TenantDirectoryEntry({
    required this.tenantId,
    required this.region,
    required this.groups,
    required this.dedicated,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'region': region,
    'groups': groups,
    'dedicated': dedicated,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Tenant whose row is removed from the directory of a service.
@immutable
final class TenantDirectoryRef {
  const TenantDirectoryRef({required this.tenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantDirectoryRef.fromJson(Map<String, dynamic> json) {
    try {
      return TenantDirectoryRef(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantDirectoryRef: $error', json);
    }
  }

  final String tenantId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantDirectoryRef value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantDirectoryRef && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Acknowledgement of the placement or removal of a tenant in the directory of a service.
@immutable
final class TenantDirectoryAck {
  const TenantDirectoryAck({required this.tenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantDirectoryAck.fromJson(Map<String, dynamic> json) {
    try {
      return TenantDirectoryAck(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantDirectoryAck: $error', json);
    }
  }

  final String tenantId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantDirectoryAck value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantDirectoryAck && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Public error data, for example the URL of the tenant region.
@immutable
final class ProblemDetailsDetails {
  const ProblemDetailsDetails({this.apiBaseUrl, this.region});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'apiBaseUrl': ?apiBaseUrl,
    'region': ?region,
  };

  /// Same as [toJson], for use as a constant tear-off.
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
