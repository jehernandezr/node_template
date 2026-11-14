// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import 'package:meta/meta.dart';

import '../../core/core.dart';
import '../../identity/enums/identity_enums.dart';

/// Inicio de sesión con email y contraseña.
@immutable
final class SignInRequest {
  const SignInRequest({
    required this.email,
    required this.password,
    this.deviceId,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SignInRequest.fromJson(Map<String, dynamic> json) {
    try {
      return SignInRequest(
        email: json['email'] as String,
        password: json['password'] as String,
        deviceId: json['deviceId'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SignInRequest: $error', json);
    }
  }

  final String email;

  final String password;

  final String? deviceId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'email': email,
    'password': password,
    'deviceId': ?deviceId,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SignInRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SignInRequest &&
          contractEquals(email, other.email) &&
          contractEquals(password, other.password) &&
          contractEquals(deviceId, other.deviceId);

  @override
  int get hashCode => contractHash([email, password, deviceId]);
}

/// Tokens de una sesión.
@immutable
final class SessionTokens {
  const SessionTokens({
    required this.accessToken,
    required this.accessExpiresAt,
    this.sessionToken,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SessionTokens.fromJson(Map<String, dynamic> json) {
    try {
      return SessionTokens(
        accessToken: json['accessToken'] as String,
        accessExpiresAt: DateTime.parse(json['accessExpiresAt'] as String),
        sessionToken: json['sessionToken'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SessionTokens: $error', json);
    }
  }

  final String accessToken;

  final DateTime accessExpiresAt;

  final String? sessionToken;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'accessToken': accessToken,
    'accessExpiresAt': accessExpiresAt.toUtc().toIso8601String(),
    'sessionToken': ?sessionToken,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SessionTokens value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionTokens &&
          contractEquals(accessToken, other.accessToken) &&
          contractEquals(accessExpiresAt, other.accessExpiresAt) &&
          contractEquals(sessionToken, other.sessionToken);

  @override
  int get hashCode =>
      contractHash([accessToken, accessExpiresAt, sessionToken]);
}

/// Desafío MFA pendiente.
@immutable
final class PendingMfa {
  const PendingMfa({required this.mfaToken, required this.methods});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory PendingMfa.fromJson(Map<String, dynamic> json) {
    try {
      return PendingMfa(
        mfaToken: json['mfaToken'] as String,
        methods: [
          for (final e0 in json['methods'] as List<dynamic>)
            ?MfaFactor.tryParse(e0 as String),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PendingMfa: $error', json);
    }
  }

  final String mfaToken;

  final List<MfaFactor> methods;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'methods': [for (final e0 in methods) e0.wireCode],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(PendingMfa value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PendingMfa &&
          contractEquals(mfaToken, other.mfaToken) &&
          contractEquals(methods, other.methods);

  @override
  int get hashCode => contractHash([mfaToken, methods]);
}

/// Resultado de un login o de una verificación MFA.
@immutable
final class SignInResponse {
  const SignInResponse({required this.status, this.tokens, this.mfa});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SignInResponse.fromJson(Map<String, dynamic> json) {
    try {
      return SignInResponse(
        status: decodeEnum(
          json['status'],
          SignInStatus.tryParse,
          'SignInStatus',
        ),
        tokens: json['tokens'] == null
            ? null
            : SessionTokens.fromJson(json['tokens'] as Map<String, dynamic>),
        mfa: json['mfa'] == null
            ? null
            : PendingMfa.fromJson(json['mfa'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SignInResponse: $error', json);
    }
  }

  final SignInStatus status;

  final SessionTokens? tokens;

  final PendingMfa? mfa;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'status': status.wireCode,
    if (tokens case final value?) 'tokens': value.toJson(),
    if (mfa case final value?) 'mfa': value.toJson(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SignInResponse value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SignInResponse &&
          contractEquals(status, other.status) &&
          contractEquals(tokens, other.tokens) &&
          contractEquals(mfa, other.mfa);

  @override
  int get hashCode => contractHash([status, tokens, mfa]);
}

/// Pedido de un desafío MFA.
@immutable
final class MfaChallengeRequest {
  const MfaChallengeRequest({required this.mfaToken, required this.method});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory MfaChallengeRequest.fromJson(Map<String, dynamic> json) {
    try {
      return MfaChallengeRequest(
        mfaToken: json['mfaToken'] as String,
        method: decodeEnum(json['method'], MfaFactor.tryParse, 'MfaFactor'),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MfaChallengeRequest: $error', json);
    }
  }

  final String mfaToken;

  final MfaFactor method;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'method': method.wireCode,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(MfaChallengeRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MfaChallengeRequest &&
          contractEquals(mfaToken, other.mfaToken) &&
          contractEquals(method, other.method);

  @override
  int get hashCode => contractHash([mfaToken, method]);
}

/// Desafío MFA creado.
@immutable
final class MfaChallenge {
  const MfaChallenge({
    required this.challengeId,
    required this.method,
    required this.expiresAt,
    this.codeLength,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory MfaChallenge.fromJson(Map<String, dynamic> json) {
    try {
      return MfaChallenge(
        challengeId: json['challengeId'] as String,
        method: decodeEnum(json['method'], MfaFactor.tryParse, 'MfaFactor'),
        expiresAt: DateTime.parse(json['expiresAt'] as String),
        codeLength: json['codeLength'] == null
            ? null
            : (json['codeLength'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MfaChallenge: $error', json);
    }
  }

  final String challengeId;

  final MfaFactor method;

  final DateTime expiresAt;

  final int? codeLength;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'challengeId': challengeId,
    'method': method.wireCode,
    'expiresAt': expiresAt.toUtc().toIso8601String(),
    'codeLength': ?codeLength,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(MfaChallenge value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MfaChallenge &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(method, other.method) &&
          contractEquals(expiresAt, other.expiresAt) &&
          contractEquals(codeLength, other.codeLength);

  @override
  int get hashCode =>
      contractHash([challengeId, method, expiresAt, codeLength]);
}

/// Verificación de un desafío MFA.
@immutable
final class MfaVerifyRequest {
  const MfaVerifyRequest({
    required this.mfaToken,
    required this.challengeId,
    required this.code,
    this.devicePublicKey,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory MfaVerifyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return MfaVerifyRequest(
        mfaToken: json['mfaToken'] as String,
        challengeId: json['challengeId'] as String,
        code: json['code'] as String,
        devicePublicKey: json['devicePublicKey'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MfaVerifyRequest: $error', json);
    }
  }

  final String mfaToken;

  final String challengeId;

  final String code;

  final String? devicePublicKey;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'challengeId': challengeId,
    'code': code,
    'devicePublicKey': ?devicePublicKey,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(MfaVerifyRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MfaVerifyRequest &&
          contractEquals(mfaToken, other.mfaToken) &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(code, other.code) &&
          contractEquals(devicePublicKey, other.devicePublicKey);

  @override
  int get hashCode =>
      contractHash([mfaToken, challengeId, code, devicePublicKey]);
}

/// Session token a rotar o cerrar. En web se omite y viaja en la cookie httpOnly.
@immutable
final class SessionTokenRequest {
  const SessionTokenRequest({this.sessionToken});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SessionTokenRequest.fromJson(Map<String, dynamic> json) {
    try {
      return SessionTokenRequest(sessionToken: json['sessionToken'] as String?);
    } on TypeError catch (error) {
      throw FormatException('Invalid SessionTokenRequest: $error', json);
    }
  }

  final String? sessionToken;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'sessionToken': ?sessionToken,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SessionTokenRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionTokenRequest &&
          contractEquals(sessionToken, other.sessionToken);

  @override
  int get hashCode => contractHash([sessionToken]);
}

/// Verificación del paso adicional de una sesión abierta.
@immutable
final class StepUpVerifyRequest {
  const StepUpVerifyRequest({
    required this.mfaToken,
    required this.challengeId,
    required this.code,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory StepUpVerifyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return StepUpVerifyRequest(
        mfaToken: json['mfaToken'] as String,
        challengeId: json['challengeId'] as String,
        code: json['code'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid StepUpVerifyRequest: $error', json);
    }
  }

  final String mfaToken;

  final String challengeId;

  final String code;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'challengeId': challengeId,
    'code': code,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(StepUpVerifyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StepUpVerifyRequest &&
          contractEquals(mfaToken, other.mfaToken) &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(code, other.code);

  @override
  int get hashCode => contractHash([mfaToken, challengeId, code]);
}

/// Paso adicional verificado: access token nuevo y último MFA de la sesión.
@immutable
final class StepUpResult {
  const StepUpResult({required this.tokens, required this.mfaVerifiedAt});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory StepUpResult.fromJson(Map<String, dynamic> json) {
    try {
      return StepUpResult(
        tokens: SessionTokens.fromJson(json['tokens'] as Map<String, dynamic>),
        mfaVerifiedAt: DateTime.parse(json['mfaVerifiedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid StepUpResult: $error', json);
    }
  }

  final SessionTokens tokens;

  final DateTime mfaVerifiedAt;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tokens': tokens.toJson(),
    'mfaVerifiedAt': mfaVerifiedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(StepUpResult value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StepUpResult &&
          contractEquals(tokens, other.tokens) &&
          contractEquals(mfaVerifiedAt, other.mfaVerifiedAt);

  @override
  int get hashCode => contractHash([tokens, mfaVerifiedAt]);
}

/// Sesión activa en un dispositivo.
@immutable
final class SessionSummary {
  const SessionSummary({
    required this.id,
    required this.deviceName,
    required this.platform,
    required this.lastSeenAt,
    required this.current,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SessionSummary.fromJson(Map<String, dynamic> json) {
    try {
      return SessionSummary(
        id: json['id'] as String,
        deviceName: json['deviceName'] as String,
        platform: decodeEnum(
          json['platform'],
          ClientPlatform.tryParse,
          'ClientPlatform',
        ),
        lastSeenAt: DateTime.parse(json['lastSeenAt'] as String),
        current: json['current'] as bool,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SessionSummary: $error', json);
    }
  }

  final String id;

  final String deviceName;

  final ClientPlatform platform;

  final DateTime lastSeenAt;

  final bool current;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'deviceName': deviceName,
    'platform': platform.wireCode,
    'lastSeenAt': lastSeenAt.toUtc().toIso8601String(),
    'current': current,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SessionSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionSummary &&
          contractEquals(id, other.id) &&
          contractEquals(deviceName, other.deviceName) &&
          contractEquals(platform, other.platform) &&
          contractEquals(lastSeenAt, other.lastSeenAt) &&
          contractEquals(current, other.current);

  @override
  int get hashCode =>
      contractHash([id, deviceName, platform, lastSeenAt, current]);
}

/// Página de sesiones.
@immutable
final class SessionPage {
  const SessionPage({required this.items, required this.nextCursor});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SessionPage.fromJson(Map<String, dynamic> json) {
    try {
      return SessionPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            SessionSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SessionPage: $error', json);
    }
  }

  final List<SessionSummary> items;

  final String? nextCursor;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SessionPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Dispositivo con confianza vigente.
@immutable
final class DeviceSummary {
  const DeviceSummary({
    required this.id,
    required this.name,
    required this.platform,
    required this.lastSeenAt,
    this.trustedUntil,
    required this.verifier,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory DeviceSummary.fromJson(Map<String, dynamic> json) {
    try {
      return DeviceSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        platform: decodeEnum(
          json['platform'],
          ClientPlatform.tryParse,
          'ClientPlatform',
        ),
        lastSeenAt: DateTime.parse(json['lastSeenAt'] as String),
        trustedUntil: json['trustedUntil'] == null
            ? null
            : DateTime.parse(json['trustedUntil'] as String),
        verifier: json['verifier'] as bool,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid DeviceSummary: $error', json);
    }
  }

  final String id;

  final String name;

  final ClientPlatform platform;

  final DateTime lastSeenAt;

  final DateTime? trustedUntil;

  final bool verifier;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'platform': platform.wireCode,
    'lastSeenAt': lastSeenAt.toUtc().toIso8601String(),
    if (trustedUntil case final value?)
      'trustedUntil': value.toUtc().toIso8601String(),
    'verifier': verifier,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(DeviceSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceSummary &&
          contractEquals(id, other.id) &&
          contractEquals(name, other.name) &&
          contractEquals(platform, other.platform) &&
          contractEquals(lastSeenAt, other.lastSeenAt) &&
          contractEquals(trustedUntil, other.trustedUntil) &&
          contractEquals(verifier, other.verifier);

  @override
  int get hashCode =>
      contractHash([id, name, platform, lastSeenAt, trustedUntil, verifier]);
}

/// Página de dispositivos.
@immutable
final class DevicePage {
  const DevicePage({required this.items, required this.nextCursor});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory DevicePage.fromJson(Map<String, dynamic> json) {
    try {
      return DevicePage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            DeviceSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid DevicePage: $error', json);
    }
  }

  final List<DeviceSummary> items;

  final String? nextCursor;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(DevicePage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DevicePage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Sesión a cerrar.
@immutable
final class RevokeSessionRequest {
  const RevokeSessionRequest({required this.sessionId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory RevokeSessionRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RevokeSessionRequest(sessionId: json['sessionId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid RevokeSessionRequest: $error', json);
    }
  }

  final String sessionId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'sessionId': sessionId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(RevokeSessionRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RevokeSessionRequest &&
          contractEquals(sessionId, other.sessionId);

  @override
  int get hashCode => contractHash([sessionId]);
}

/// Cantidad de sesiones cerradas.
@immutable
final class RevokedSessions {
  const RevokedSessions({required this.revoked});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory RevokedSessions.fromJson(Map<String, dynamic> json) {
    try {
      return RevokedSessions(revoked: (json['revoked'] as num).toInt());
    } on TypeError catch (error) {
      throw FormatException('Invalid RevokedSessions: $error', json);
    }
  }

  final int revoked;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'revoked': revoked};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(RevokedSessions value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RevokedSessions && contractEquals(revoked, other.revoked);

  @override
  int get hashCode => contractHash([revoked]);
}

/// Revoca todas las sesiones de un usuario.
@immutable
final class RevokeUserSessionsInput {
  const RevokeUserSessionsInput({required this.userId, required this.reason});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory RevokeUserSessionsInput.fromJson(Map<String, dynamic> json) {
    try {
      return RevokeUserSessionsInput(
        userId: json['userId'] as String,
        reason: decodeEnum(
          json['reason'],
          RevocationReason.tryParse,
          'RevocationReason',
        ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid RevokeUserSessionsInput: $error', json);
    }
  }

  final String userId;

  final RevocationReason reason;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'reason': reason.wireCode,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(RevokeUserSessionsInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RevokeUserSessionsInput &&
          contractEquals(userId, other.userId) &&
          contractEquals(reason, other.reason);

  @override
  int get hashCode => contractHash([userId, reason]);
}

/// Usuario y tenant a consultar.
@immutable
final class GetUserAccessInput {
  const GetUserAccessInput({required this.userId, required this.tenantId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory GetUserAccessInput.fromJson(Map<String, dynamic> json) {
    try {
      return GetUserAccessInput(
        userId: json['userId'] as String,
        tenantId: json['tenantId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid GetUserAccessInput: $error', json);
    }
  }

  final String userId;

  final String tenantId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'tenantId': tenantId,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(GetUserAccessInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetUserAccessInput &&
          contractEquals(userId, other.userId) &&
          contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([userId, tenantId]);
}

/// Acceso efectivo de un usuario en un tenant.
@immutable
final class UserAccess {
  const UserAccess({
    required this.permissions,
    required this.platformRoles,
    required this.features,
    required this.flags,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory UserAccess.fromJson(Map<String, dynamic> json) {
    try {
      return UserAccess(
        permissions: [
          for (final e0 in json['permissions'] as List<dynamic>)
            ?Permission.tryParse(e0 as String),
        ],
        platformRoles: [
          for (final e0 in json['platformRoles'] as List<dynamic>)
            ?PlatformRole.tryParse(e0 as String),
        ],
        features: [
          for (final e0 in json['features'] as List<dynamic>)
            ?PlanFeature.tryParse(e0 as String),
        ],
        flags: [
          for (final e0 in json['flags'] as List<dynamic>)
            ?FeatureFlag.tryParse(e0 as String),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserAccess: $error', json);
    }
  }

  final List<Permission> permissions;

  final List<PlatformRole> platformRoles;

  final List<PlanFeature> features;

  final List<FeatureFlag> flags;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'permissions': [for (final e0 in permissions) e0.wireCode],
    'platformRoles': [for (final e0 in platformRoles) e0.wireCode],
    'features': [for (final e0 in features) e0.wireCode],
    'flags': [for (final e0 in flags) e0.wireCode],
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(UserAccess value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserAccess &&
          contractEquals(permissions, other.permissions) &&
          contractEquals(platformRoles, other.platformRoles) &&
          contractEquals(features, other.features) &&
          contractEquals(flags, other.flags);

  @override
  int get hashCode =>
      contractHash([permissions, platformRoles, features, flags]);
}

/// Acceso de la sesión actual: usuario, tenant, permisos, roles, plan, flags y último MFA.
@immutable
final class SessionAccess {
  const SessionAccess({
    required this.userId,
    required this.tenantId,
    required this.sessionId,
    required this.permissions,
    required this.platformRoles,
    required this.features,
    required this.flags,
    required this.mfaVerifiedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SessionAccess.fromJson(Map<String, dynamic> json) {
    try {
      return SessionAccess(
        userId: json['userId'] as String,
        tenantId: json['tenantId'] as String,
        sessionId: json['sessionId'] as String,
        permissions: [
          for (final e0 in json['permissions'] as List<dynamic>)
            ?Permission.tryParse(e0 as String),
        ],
        platformRoles: [
          for (final e0 in json['platformRoles'] as List<dynamic>)
            ?PlatformRole.tryParse(e0 as String),
        ],
        features: [
          for (final e0 in json['features'] as List<dynamic>)
            ?PlanFeature.tryParse(e0 as String),
        ],
        flags: [
          for (final e0 in json['flags'] as List<dynamic>)
            ?FeatureFlag.tryParse(e0 as String),
        ],
        mfaVerifiedAt: json['mfaVerifiedAt'] == null
            ? null
            : DateTime.parse(json['mfaVerifiedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SessionAccess: $error', json);
    }
  }

  final String userId;

  final String tenantId;

  final String sessionId;

  final List<Permission> permissions;

  final List<PlatformRole> platformRoles;

  final List<PlanFeature> features;

  final List<FeatureFlag> flags;

  final DateTime? mfaVerifiedAt;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'tenantId': tenantId,
    'sessionId': sessionId,
    'permissions': [for (final e0 in permissions) e0.wireCode],
    'platformRoles': [for (final e0 in platformRoles) e0.wireCode],
    'features': [for (final e0 in features) e0.wireCode],
    'flags': [for (final e0 in flags) e0.wireCode],
    'mfaVerifiedAt': switch (mfaVerifiedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SessionAccess value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionAccess &&
          contractEquals(userId, other.userId) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(sessionId, other.sessionId) &&
          contractEquals(permissions, other.permissions) &&
          contractEquals(platformRoles, other.platformRoles) &&
          contractEquals(features, other.features) &&
          contractEquals(flags, other.flags) &&
          contractEquals(mfaVerifiedAt, other.mfaVerifiedAt);

  @override
  int get hashCode => contractHash([
    userId,
    tenantId,
    sessionId,
    permissions,
    platformRoles,
    features,
    flags,
    mfaVerifiedAt,
  ]);
}

/// Se revocó una sesión.
@immutable
final class SessionRevokedPayload {
  const SessionRevokedPayload({
    required this.sessionId,
    required this.userId,
    required this.tenantId,
    required this.reason,
    required this.revokedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory SessionRevokedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return SessionRevokedPayload(
        sessionId: json['sessionId'] as String,
        userId: json['userId'] as String,
        tenantId: json['tenantId'] as String,
        reason: decodeEnum(
          json['reason'],
          RevocationReason.tryParse,
          'RevocationReason',
        ),
        revokedAt: DateTime.parse(json['revokedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SessionRevokedPayload: $error', json);
    }
  }

  final String sessionId;

  final String userId;

  final String tenantId;

  final RevocationReason reason;

  final DateTime revokedAt;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'sessionId': sessionId,
    'userId': userId,
    'tenantId': tenantId,
    'reason': reason.wireCode,
    'revokedAt': revokedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(SessionRevokedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionRevokedPayload &&
          contractEquals(sessionId, other.sessionId) &&
          contractEquals(userId, other.userId) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(reason, other.reason) &&
          contractEquals(revokedAt, other.revokedAt);

  @override
  int get hashCode =>
      contractHash([sessionId, userId, tenantId, reason, revokedAt]);
}

/// Se revocaron tokens de una sesión, un usuario o un tenant.
@immutable
final class TokensRevokedPayload {
  const TokensRevokedPayload({
    required this.scope,
    required this.subjectId,
    required this.revokedBefore,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TokensRevokedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return TokensRevokedPayload(
        scope: decodeEnum(
          json['scope'],
          RevocationScope.tryParse,
          'RevocationScope',
        ),
        subjectId: json['subjectId'] as String,
        revokedBefore: DateTime.parse(json['revokedBefore'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TokensRevokedPayload: $error', json);
    }
  }

  final RevocationScope scope;

  final String subjectId;

  final DateTime revokedBefore;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'scope': scope.wireCode,
    'subjectId': subjectId,
    'revokedBefore': revokedBefore.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TokensRevokedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TokensRevokedPayload &&
          contractEquals(scope, other.scope) &&
          contractEquals(subjectId, other.subjectId) &&
          contractEquals(revokedBefore, other.revokedBefore);

  @override
  int get hashCode => contractHash([scope, subjectId, revokedBefore]);
}
