// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import 'package:meta/meta.dart';

import '../../core/core.dart';
import '../../identity/enums/identity_enums.dart';
import '../../platform/types/platform_types.dart';

/// Claims of the JWT access token.
@immutable
final class AccessTokenClaims {
  const AccessTokenClaims({
    required this.iss,
    required this.aud,
    required this.sub,
    required this.tid,
    required this.htid,
    required this.sid,
    this.did,
    required this.amr,
    required this.authTime,
    required this.roles,
    required this.proles,
    required this.pv,
    required this.rgn,
    required this.sxp,
    required this.iat,
    required this.exp,
    required this.jti,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory AccessTokenClaims.fromJson(Map<String, dynamic> json) {
    try {
      return AccessTokenClaims(
        iss: json['iss'] as String,
        aud: decodeEnum(json['aud'], TokenAudience.tryParse, 'TokenAudience'),
        sub: json['sub'] as String,
        tid: json['tid'] as String,
        htid: json['htid'] as String,
        sid: json['sid'] as String,
        did: json['did'] as String?,
        amr: [
          for (final e0 in json['amr'] as List<dynamic>)
            ?AuthMethodReference.tryParse(e0 as String),
        ],
        authTime: (json['auth_time'] as num).toInt(),
        roles: [for (final e0 in json['roles'] as List<dynamic>) e0 as String],
        proles: [
          for (final e0 in json['proles'] as List<dynamic>) e0 as String,
        ],
        pv: json['pv'] as String,
        rgn: json['rgn'] as String,
        sxp: (json['sxp'] as num).toInt(),
        iat: (json['iat'] as num).toInt(),
        exp: (json['exp'] as num).toInt(),
        jti: json['jti'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid AccessTokenClaims: $error', json);
    }
  }

  final String iss;

  final TokenAudience aud;

  final String sub;

  final String tid;

  final String htid;

  final String sid;

  final String? did;

  final List<AuthMethodReference> amr;

  final int authTime;

  final List<String> roles;

  final List<String> proles;

  final String pv;

  final String rgn;

  final int sxp;

  final int iat;

  final int exp;

  final String jti;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'iss': iss,
    'aud': aud.wireCode,
    'sub': sub,
    'tid': tid,
    'htid': htid,
    'sid': sid,
    'did': ?did,
    'amr': [for (final e0 in amr) e0.wireCode],
    'auth_time': authTime,
    'roles': roles,
    'proles': proles,
    'pv': pv,
    'rgn': rgn,
    'sxp': sxp,
    'iat': iat,
    'exp': exp,
    'jti': jti,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(AccessTokenClaims value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AccessTokenClaims &&
          contractEquals(iss, other.iss) &&
          contractEquals(aud, other.aud) &&
          contractEquals(sub, other.sub) &&
          contractEquals(tid, other.tid) &&
          contractEquals(htid, other.htid) &&
          contractEquals(sid, other.sid) &&
          contractEquals(did, other.did) &&
          contractEquals(amr, other.amr) &&
          contractEquals(authTime, other.authTime) &&
          contractEquals(roles, other.roles) &&
          contractEquals(proles, other.proles) &&
          contractEquals(pv, other.pv) &&
          contractEquals(rgn, other.rgn) &&
          contractEquals(sxp, other.sxp) &&
          contractEquals(iat, other.iat) &&
          contractEquals(exp, other.exp) &&
          contractEquals(jti, other.jti);

  @override
  int get hashCode => contractHash([
    iss,
    aud,
    sub,
    tid,
    htid,
    sid,
    did,
    amr,
    authTime,
    roles,
    proles,
    pv,
    rgn,
    sxp,
    iat,
    exp,
    jti,
  ]);
}

/// Proof that a request comes from a registered device, signed with its key.
@immutable
final class DeviceSignatureFields {
  const DeviceSignatureFields({
    required this.deviceId,
    required this.timestamp,
    required this.nonce,
    required this.signature,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DeviceSignatureFields.fromJson(Map<String, dynamic> json) {
    try {
      return DeviceSignatureFields(
        deviceId: json['deviceId'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
        nonce: json['nonce'] as String,
        signature: json['signature'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid DeviceSignatureFields: $error', json);
    }
  }

  final String deviceId;

  final DateTime timestamp;

  final String nonce;

  final String signature;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'deviceId': deviceId,
    'timestamp': timestamp.toUtc().toIso8601String(),
    'nonce': nonce,
    'signature': signature,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DeviceSignatureFields value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceSignatureFields &&
          contractEquals(deviceId, other.deviceId) &&
          contractEquals(timestamp, other.timestamp) &&
          contractEquals(nonce, other.nonce) &&
          contractEquals(signature, other.signature);

  @override
  int get hashCode => contractHash([deviceId, timestamp, nonce, signature]);
}

/// Sign-in with email and password.
@immutable
final class SignInRequest {
  const SignInRequest({
    required this.email,
    required this.password,
    this.device,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SignInRequest.fromJson(Map<String, dynamic> json) {
    try {
      return SignInRequest(
        email: json['email'] as String,
        password: json['password'] as String,
        device: json['device'] == null
            ? null
            : DeviceSignatureFields.fromJson(
                json['device'] as Map<String, dynamic>,
              ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SignInRequest: $error', json);
    }
  }

  final String email;

  final String password;

  final DeviceSignatureFields? device;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'email': email,
    'password': password,
    if (device case final value?) 'device': value.toJson(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SignInRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SignInRequest &&
          contractEquals(email, other.email) &&
          contractEquals(password, other.password) &&
          contractEquals(device, other.device);

  @override
  int get hashCode => contractHash([email, password, device]);
}

/// Tokens of a session.
@immutable
final class SessionTokens {
  const SessionTokens({
    required this.accessToken,
    required this.accessExpiresAt,
    this.sessionToken,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'accessToken': accessToken,
    'accessExpiresAt': accessExpiresAt.toUtc().toIso8601String(),
    'sessionToken': ?sessionToken,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Pending MFA challenge.
@immutable
final class PendingMfa {
  const PendingMfa({required this.mfaToken, required this.methods});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'methods': [for (final e0 in methods) e0.wireCode],
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Result of a sign-in or of an MFA verification.
@immutable
final class SignInResponse {
  const SignInResponse({
    required this.status,
    this.tokens,
    this.mfa,
    this.region,
    this.apiBaseUrl,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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
        region: json['region'] as String?,
        apiBaseUrl: json['apiBaseUrl'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SignInResponse: $error', json);
    }
  }

  final SignInStatus status;

  final SessionTokens? tokens;

  final PendingMfa? mfa;

  final String? region;

  final String? apiBaseUrl;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'status': status.wireCode,
    if (tokens case final value?) 'tokens': value.toJson(),
    if (mfa case final value?) 'mfa': value.toJson(),
    'region': ?region,
    'apiBaseUrl': ?apiBaseUrl,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SignInResponse value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SignInResponse &&
          contractEquals(status, other.status) &&
          contractEquals(tokens, other.tokens) &&
          contractEquals(mfa, other.mfa) &&
          contractEquals(region, other.region) &&
          contractEquals(apiBaseUrl, other.apiBaseUrl);

  @override
  int get hashCode => contractHash([status, tokens, mfa, region, apiBaseUrl]);
}

/// Request for an MFA challenge.
@immutable
final class MfaChallengeRequest {
  const MfaChallengeRequest({required this.mfaToken, required this.method});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'method': method.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// MFA challenge created.
@immutable
final class MfaChallenge {
  const MfaChallenge({
    required this.challengeId,
    required this.method,
    required this.expiresAt,
    this.codeLength,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'challengeId': challengeId,
    'method': method.wireCode,
    'expiresAt': expiresAt.toUtc().toIso8601String(),
    'codeLength': ?codeLength,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Verification of an MFA challenge.
@immutable
final class MfaVerifyRequest {
  const MfaVerifyRequest({
    required this.mfaToken,
    required this.challengeId,
    required this.code,
    this.devicePublicKey,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'challengeId': challengeId,
    'code': code,
    'devicePublicKey': ?devicePublicKey,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Session token to rotate or close. On the web it is omitted and travels in the httpOnly cookie.
@immutable
final class SessionTokenRequest {
  const SessionTokenRequest({this.sessionToken});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SessionTokenRequest.fromJson(Map<String, dynamic> json) {
    try {
      return SessionTokenRequest(sessionToken: json['sessionToken'] as String?);
    } on TypeError catch (error) {
      throw FormatException('Invalid SessionTokenRequest: $error', json);
    }
  }

  final String? sessionToken;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'sessionToken': ?sessionToken,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Verification of the step-up of an open session.
@immutable
final class StepUpVerifyRequest {
  const StepUpVerifyRequest({
    required this.mfaToken,
    required this.challengeId,
    required this.code,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'challengeId': challengeId,
    'code': code,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Verified step-up: new access token and last MFA of the session.
@immutable
final class StepUpResult {
  const StepUpResult({required this.tokens, required this.mfaVerifiedAt});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tokens': tokens.toJson(),
    'mfaVerifiedAt': mfaVerifiedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Active session on a device.
@immutable
final class SessionSummary {
  const SessionSummary({
    required this.id,
    required this.deviceName,
    required this.platform,
    required this.lastSeenAt,
    required this.current,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'deviceName': deviceName,
    'platform': platform.wireCode,
    'lastSeenAt': lastSeenAt.toUtc().toIso8601String(),
    'current': current,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Page of sessions.
@immutable
final class SessionPage {
  const SessionPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Device with active trust.
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

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'platform': platform.wireCode,
    'lastSeenAt': lastSeenAt.toUtc().toIso8601String(),
    if (trustedUntil case final value?)
      'trustedUntil': value.toUtc().toIso8601String(),
    'verifier': verifier,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Page of devices.
@immutable
final class DevicePage {
  const DevicePage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Session to close.
@immutable
final class RevokeSessionRequest {
  const RevokeSessionRequest({required this.sessionId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RevokeSessionRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RevokeSessionRequest(sessionId: json['sessionId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid RevokeSessionRequest: $error', json);
    }
  }

  final String sessionId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'sessionId': sessionId};

  /// Same as [toJson], for use as a constant tear-off.
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

/// Number of closed sessions.
@immutable
final class RevokedSessions {
  const RevokedSessions({required this.revoked});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RevokedSessions.fromJson(Map<String, dynamic> json) {
    try {
      return RevokedSessions(revoked: (json['revoked'] as num).toInt());
    } on TypeError catch (error) {
      throw FormatException('Invalid RevokedSessions: $error', json);
    }
  }

  final int revoked;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'revoked': revoked};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RevokedSessions value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RevokedSessions && contractEquals(revoked, other.revoked);

  @override
  int get hashCode => contractHash([revoked]);
}

/// Revokes all sessions of a user.
@immutable
final class RevokeUserSessionsInput {
  const RevokeUserSessionsInput({required this.userId, required this.reason});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'reason': reason.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// User and tenant to query.
@immutable
final class GetUserAccessInput {
  const GetUserAccessInput({required this.userId, required this.tenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'tenantId': tenantId,
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Effective access of a user in a tenant.
@immutable
final class UserAccess {
  const UserAccess({
    required this.permissions,
    required this.roles,
    required this.permissionVersion,
    required this.platformRoles,
    required this.features,
    required this.flags,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserAccess.fromJson(Map<String, dynamic> json) {
    try {
      return UserAccess(
        permissions: [
          for (final e0 in json['permissions'] as List<dynamic>)
            ?Permission.tryParse(e0 as String),
        ],
        roles: [for (final e0 in json['roles'] as List<dynamic>) e0 as String],
        permissionVersion: json['permissionVersion'] as String,
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

  final List<String> roles;

  final String permissionVersion;

  final List<PlatformRole> platformRoles;

  final List<PlanFeature> features;

  final List<FeatureFlag> flags;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'permissions': [for (final e0 in permissions) e0.wireCode],
    'roles': roles,
    'permissionVersion': permissionVersion,
    'platformRoles': [for (final e0 in platformRoles) e0.wireCode],
    'features': [for (final e0 in features) e0.wireCode],
    'flags': [for (final e0 in flags) e0.wireCode],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserAccess value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserAccess &&
          contractEquals(permissions, other.permissions) &&
          contractEquals(roles, other.roles) &&
          contractEquals(permissionVersion, other.permissionVersion) &&
          contractEquals(platformRoles, other.platformRoles) &&
          contractEquals(features, other.features) &&
          contractEquals(flags, other.flags);

  @override
  int get hashCode => contractHash([
    permissions,
    roles,
    permissionVersion,
    platformRoles,
    features,
    flags,
  ]);
}

/// Access of the current session: user, tenant, permissions, roles, plan, flags and last MFA.
@immutable
final class SessionAccess {
  const SessionAccess({
    required this.userId,
    required this.tenantId,
    required this.sessionId,
    required this.permissions,
    required this.roles,
    required this.permissionVersion,
    required this.platformRoles,
    required this.features,
    required this.flags,
    required this.mfaVerifiedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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
        roles: [for (final e0 in json['roles'] as List<dynamic>) e0 as String],
        permissionVersion: json['permissionVersion'] as String,
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

  final List<String> roles;

  final String permissionVersion;

  final List<PlatformRole> platformRoles;

  final List<PlanFeature> features;

  final List<FeatureFlag> flags;

  final DateTime? mfaVerifiedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'tenantId': tenantId,
    'sessionId': sessionId,
    'permissions': [for (final e0 in permissions) e0.wireCode],
    'roles': roles,
    'permissionVersion': permissionVersion,
    'platformRoles': [for (final e0 in platformRoles) e0.wireCode],
    'features': [for (final e0 in features) e0.wireCode],
    'flags': [for (final e0 in flags) e0.wireCode],
    'mfaVerifiedAt': switch (mfaVerifiedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SessionAccess value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionAccess &&
          contractEquals(userId, other.userId) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(sessionId, other.sessionId) &&
          contractEquals(permissions, other.permissions) &&
          contractEquals(roles, other.roles) &&
          contractEquals(permissionVersion, other.permissionVersion) &&
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
    roles,
    permissionVersion,
    platformRoles,
    features,
    flags,
    mfaVerifiedAt,
  ]);
}

/// A session was revoked.
@immutable
final class SessionRevokedPayload {
  const SessionRevokedPayload({
    required this.sessionId,
    required this.userId,
    required this.tenantId,
    required this.reason,
    required this.revokedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'sessionId': sessionId,
    'userId': userId,
    'tenantId': tenantId,
    'reason': reason.wireCode,
    'revokedAt': revokedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Tokens of a session, a user or a tenant were revoked.
@immutable
final class TokensRevokedPayload {
  const TokensRevokedPayload({
    required this.scope,
    required this.subjectId,
    required this.revokedBefore,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
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

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'scope': scope.wireCode,
    'subjectId': subjectId,
    'revokedBefore': revokedBefore.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
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

/// Registration of a user with email, password, name and language.
@immutable
final class SignUpRequest {
  const SignUpRequest({
    required this.email,
    required this.password,
    required this.displayName,
    required this.locale,
    this.invitationToken,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SignUpRequest.fromJson(Map<String, dynamic> json) {
    try {
      return SignUpRequest(
        email: json['email'] as String,
        password: json['password'] as String,
        displayName: json['displayName'] as String,
        locale: json['locale'] as String,
        invitationToken: json['invitationToken'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SignUpRequest: $error', json);
    }
  }

  final String email;

  final String password;

  final String displayName;

  final String locale;

  final String? invitationToken;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'email': email,
    'password': password,
    'displayName': displayName,
    'locale': locale,
    'invitationToken': ?invitationToken,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SignUpRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SignUpRequest &&
          contractEquals(email, other.email) &&
          contractEquals(password, other.password) &&
          contractEquals(displayName, other.displayName) &&
          contractEquals(locale, other.locale) &&
          contractEquals(invitationToken, other.invitationToken);

  @override
  int get hashCode =>
      contractHash([email, password, displayName, locale, invitationToken]);
}

/// Request for a verification email.
@immutable
final class EmailVerificationRequest {
  const EmailVerificationRequest({required this.email});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EmailVerificationRequest.fromJson(Map<String, dynamic> json) {
    try {
      return EmailVerificationRequest(email: json['email'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid EmailVerificationRequest: $error', json);
    }
  }

  final String email;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'email': email};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EmailVerificationRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmailVerificationRequest && contractEquals(email, other.email);

  @override
  int get hashCode => contractHash([email]);
}

/// Confirmation of the email verification.
@immutable
final class EmailVerificationConfirmRequest {
  const EmailVerificationConfirmRequest({required this.token});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EmailVerificationConfirmRequest.fromJson(Map<String, dynamic> json) {
    try {
      return EmailVerificationConfirmRequest(token: json['token'] as String);
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid EmailVerificationConfirmRequest: $error',
        json,
      );
    }
  }

  final String token;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'token': token};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EmailVerificationConfirmRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmailVerificationConfirmRequest &&
          contractEquals(token, other.token);

  @override
  int get hashCode => contractHash([token]);
}

/// Profile of the authenticated user.
@immutable
final class UserProfile {
  const UserProfile({
    required this.id,
    required this.email,
    required this.emailVerifiedAt,
    required this.displayName,
    required this.locale,
    required this.status,
    required this.homeTenantId,
    required this.lastTenantId,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserProfile.fromJson(Map<String, dynamic> json) {
    try {
      return UserProfile(
        id: json['id'] as String,
        email: json['email'] as String,
        emailVerifiedAt: json['emailVerifiedAt'] == null
            ? null
            : DateTime.parse(json['emailVerifiedAt'] as String),
        displayName: json['displayName'] as String,
        locale: json['locale'] as String,
        status: decodeEnum(json['status'], UserStatus.tryParse, 'UserStatus'),
        homeTenantId: json['homeTenantId'] as String,
        lastTenantId: json['lastTenantId'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserProfile: $error', json);
    }
  }

  final String id;

  final String email;

  final DateTime? emailVerifiedAt;

  final String displayName;

  final String locale;

  final UserStatus status;

  final String homeTenantId;

  final String? lastTenantId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'email': email,
    'emailVerifiedAt': switch (emailVerifiedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'displayName': displayName,
    'locale': locale,
    'status': status.wireCode,
    'homeTenantId': homeTenantId,
    'lastTenantId': lastTenantId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserProfile value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserProfile &&
          contractEquals(id, other.id) &&
          contractEquals(email, other.email) &&
          contractEquals(emailVerifiedAt, other.emailVerifiedAt) &&
          contractEquals(displayName, other.displayName) &&
          contractEquals(locale, other.locale) &&
          contractEquals(status, other.status) &&
          contractEquals(homeTenantId, other.homeTenantId) &&
          contractEquals(lastTenantId, other.lastTenantId);

  @override
  int get hashCode => contractHash([
    id,
    email,
    emailVerifiedAt,
    displayName,
    locale,
    status,
    homeTenantId,
    lastTenantId,
  ]);
}

/// Partial changes of the profile.
@immutable
final class UpdateProfileRequest {
  const UpdateProfileRequest({this.displayName, this.locale});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UpdateProfileRequest.fromJson(Map<String, dynamic> json) {
    try {
      return UpdateProfileRequest(
        displayName: json['displayName'] as String?,
        locale: json['locale'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UpdateProfileRequest: $error', json);
    }
  }

  final String? displayName;

  final String? locale;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'displayName': ?displayName,
    'locale': ?locale,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UpdateProfileRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateProfileRequest &&
          contractEquals(displayName, other.displayName) &&
          contractEquals(locale, other.locale);

  @override
  int get hashCode => contractHash([displayName, locale]);
}

/// Request to change the email to a new address.
@immutable
final class EmailChangeRequest {
  const EmailChangeRequest({required this.newEmail});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EmailChangeRequest.fromJson(Map<String, dynamic> json) {
    try {
      return EmailChangeRequest(newEmail: json['newEmail'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid EmailChangeRequest: $error', json);
    }
  }

  final String newEmail;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'newEmail': newEmail};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EmailChangeRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmailChangeRequest && contractEquals(newEmail, other.newEmail);

  @override
  int get hashCode => contractHash([newEmail]);
}

/// Confirmation of the email change.
@immutable
final class EmailChangeConfirmRequest {
  const EmailChangeConfirmRequest({required this.token});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EmailChangeConfirmRequest.fromJson(Map<String, dynamic> json) {
    try {
      return EmailChangeConfirmRequest(token: json['token'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid EmailChangeConfirmRequest: $error', json);
    }
  }

  final String token;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'token': token};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EmailChangeConfirmRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmailChangeConfirmRequest && contractEquals(token, other.token);

  @override
  int get hashCode => contractHash([token]);
}

/// Suspends a user and revokes their sessions.
@immutable
final class SuspendUserInput {
  const SuspendUserInput({required this.userId, this.reason});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SuspendUserInput.fromJson(Map<String, dynamic> json) {
    try {
      return SuspendUserInput(
        userId: json['userId'] as String,
        reason: json['reason'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SuspendUserInput: $error', json);
    }
  }

  final String userId;

  final String? reason;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'reason': ?reason,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SuspendUserInput value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SuspendUserInput &&
          contractEquals(userId, other.userId) &&
          contractEquals(reason, other.reason);

  @override
  int get hashCode => contractHash([userId, reason]);
}

/// Reactivates a suspended user.
@immutable
final class ReactivateUserInput {
  const ReactivateUserInput({required this.userId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ReactivateUserInput.fromJson(Map<String, dynamic> json) {
    try {
      return ReactivateUserInput(userId: json['userId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid ReactivateUserInput: $error', json);
    }
  }

  final String userId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'userId': userId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ReactivateUserInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReactivateUserInput && contractEquals(userId, other.userId);

  @override
  int get hashCode => contractHash([userId]);
}

/// Result of suspending or reactivating a user.
@immutable
final class UserOperationResult {
  const UserOperationResult({required this.userId, required this.status});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserOperationResult.fromJson(Map<String, dynamic> json) {
    try {
      return UserOperationResult(
        userId: json['userId'] as String,
        status: decodeEnum(json['status'], UserStatus.tryParse, 'UserStatus'),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserOperationResult: $error', json);
    }
  }

  final String userId;

  final UserStatus status;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'status': status.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserOperationResult value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserOperationResult &&
          contractEquals(userId, other.userId) &&
          contractEquals(status, other.status);

  @override
  int get hashCode => contractHash([userId, status]);
}

/// User to query.
@immutable
final class GetUserProfileInput {
  const GetUserProfileInput({required this.userId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory GetUserProfileInput.fromJson(Map<String, dynamic> json) {
    try {
      return GetUserProfileInput(userId: json['userId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid GetUserProfileInput: $error', json);
    }
  }

  final String userId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'userId': userId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(GetUserProfileInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetUserProfileInput && contractEquals(userId, other.userId);

  @override
  int get hashCode => contractHash([userId]);
}

/// Password change with the current password.
@immutable
final class ChangePasswordRequest {
  const ChangePasswordRequest({
    required this.currentPassword,
    required this.newPassword,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ChangePasswordRequest.fromJson(Map<String, dynamic> json) {
    try {
      return ChangePasswordRequest(
        currentPassword: json['currentPassword'] as String,
        newPassword: json['newPassword'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ChangePasswordRequest: $error', json);
    }
  }

  final String currentPassword;

  final String newPassword;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'currentPassword': currentPassword,
    'newPassword': newPassword,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ChangePasswordRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChangePasswordRequest &&
          contractEquals(currentPassword, other.currentPassword) &&
          contractEquals(newPassword, other.newPassword);

  @override
  int get hashCode => contractHash([currentPassword, newPassword]);
}

/// Request for a password reset email.
@immutable
final class PasswordResetRequest {
  const PasswordResetRequest({required this.email});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasswordResetRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PasswordResetRequest(email: json['email'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid PasswordResetRequest: $error', json);
    }
  }

  final String email;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'email': email};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasswordResetRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasswordResetRequest && contractEquals(email, other.email);

  @override
  int get hashCode => contractHash([email]);
}

/// Password reset with the emailed token.
@immutable
final class PasswordResetConfirmRequest {
  const PasswordResetConfirmRequest({
    required this.token,
    required this.newPassword,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasswordResetConfirmRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PasswordResetConfirmRequest(
        token: json['token'] as String,
        newPassword: json['newPassword'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid PasswordResetConfirmRequest: $error',
        json,
      );
    }
  }

  final String token;

  final String newPassword;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'token': token,
    'newPassword': newPassword,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasswordResetConfirmRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasswordResetConfirmRequest &&
          contractEquals(token, other.token) &&
          contractEquals(newPassword, other.newPassword);

  @override
  int get hashCode => contractHash([token, newPassword]);
}

/// Device to remove from the account.
@immutable
final class RemoveDeviceRequest {
  const RemoveDeviceRequest({required this.deviceId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RemoveDeviceRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RemoveDeviceRequest(deviceId: json['deviceId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid RemoveDeviceRequest: $error', json);
    }
  }

  final String deviceId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'deviceId': deviceId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RemoveDeviceRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RemoveDeviceRequest && contractEquals(deviceId, other.deviceId);

  @override
  int get hashCode => contractHash([deviceId]);
}

/// Device whose trust is removed.
@immutable
final class UntrustDeviceRequest {
  const UntrustDeviceRequest({required this.deviceId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UntrustDeviceRequest.fromJson(Map<String, dynamic> json) {
    try {
      return UntrustDeviceRequest(deviceId: json['deviceId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid UntrustDeviceRequest: $error', json);
    }
  }

  final String deviceId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'deviceId': deviceId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UntrustDeviceRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UntrustDeviceRequest && contractEquals(deviceId, other.deviceId);

  @override
  int get hashCode => contractHash([deviceId]);
}

/// Push notification token of the current device.
@immutable
final class PushTokenRequest {
  const PushTokenRequest({required this.pushToken});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PushTokenRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PushTokenRequest(pushToken: json['pushToken'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid PushTokenRequest: $error', json);
    }
  }

  final String pushToken;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'pushToken': pushToken};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PushTokenRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PushTokenRequest && contractEquals(pushToken, other.pushToken);

  @override
  int get hashCode => contractHash([pushToken]);
}

/// Request for pending approvals signed by the device.
@immutable
final class PullDeviceApprovalsRequest {
  const PullDeviceApprovalsRequest({
    required this.deviceId,
    required this.timestamp,
    required this.nonce,
    required this.signature,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PullDeviceApprovalsRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PullDeviceApprovalsRequest(
        deviceId: json['deviceId'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
        nonce: json['nonce'] as String,
        signature: json['signature'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PullDeviceApprovalsRequest: $error', json);
    }
  }

  final String deviceId;

  final DateTime timestamp;

  final String nonce;

  final String signature;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'deviceId': deviceId,
    'timestamp': timestamp.toUtc().toIso8601String(),
    'nonce': nonce,
    'signature': signature,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PullDeviceApprovalsRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PullDeviceApprovalsRequest &&
          contractEquals(deviceId, other.deviceId) &&
          contractEquals(timestamp, other.timestamp) &&
          contractEquals(nonce, other.nonce) &&
          contractEquals(signature, other.signature);

  @override
  int get hashCode => contractHash([deviceId, timestamp, nonce, signature]);
}

/// Denial of a pending approval signed by the device.
@immutable
final class DenyDeviceApprovalRequest {
  const DenyDeviceApprovalRequest({
    required this.challengeId,
    required this.deviceId,
    required this.timestamp,
    required this.nonce,
    required this.signature,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DenyDeviceApprovalRequest.fromJson(Map<String, dynamic> json) {
    try {
      return DenyDeviceApprovalRequest(
        challengeId: json['challengeId'] as String,
        deviceId: json['deviceId'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
        nonce: json['nonce'] as String,
        signature: json['signature'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid DenyDeviceApprovalRequest: $error', json);
    }
  }

  final String challengeId;

  final String deviceId;

  final DateTime timestamp;

  final String nonce;

  final String signature;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'challengeId': challengeId,
    'deviceId': deviceId,
    'timestamp': timestamp.toUtc().toIso8601String(),
    'nonce': nonce,
    'signature': signature,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DenyDeviceApprovalRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DenyDeviceApprovalRequest &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(deviceId, other.deviceId) &&
          contractEquals(timestamp, other.timestamp) &&
          contractEquals(nonce, other.nonce) &&
          contractEquals(signature, other.signature);

  @override
  int get hashCode =>
      contractHash([challengeId, deviceId, timestamp, nonce, signature]);
}

/// Context of the approval request that the user reviews.
@immutable
final class ApprovalContext {
  const ApprovalContext({this.browser, this.os, this.ip, this.city});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ApprovalContext.fromJson(Map<String, dynamic> json) {
    try {
      return ApprovalContext(
        browser: json['browser'] as String?,
        os: json['os'] as String?,
        ip: json['ip'] as String?,
        city: json['city'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ApprovalContext: $error', json);
    }
  }

  final String? browser;

  final String? os;

  final String? ip;

  final String? city;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'browser': ?browser,
    'os': ?os,
    'ip': ?ip,
    'city': ?city,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ApprovalContext value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApprovalContext &&
          contractEquals(browser, other.browser) &&
          contractEquals(os, other.os) &&
          contractEquals(ip, other.ip) &&
          contractEquals(city, other.city);

  @override
  int get hashCode => contractHash([browser, os, ip, city]);
}

/// Pending approval of a device.
@immutable
final class DeviceApproval {
  const DeviceApproval({
    required this.challengeId,
    required this.code,
    required this.requestedAt,
    required this.expiresAt,
    required this.context,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DeviceApproval.fromJson(Map<String, dynamic> json) {
    try {
      return DeviceApproval(
        challengeId: json['challengeId'] as String,
        code: json['code'] as String,
        requestedAt: DateTime.parse(json['requestedAt'] as String),
        expiresAt: DateTime.parse(json['expiresAt'] as String),
        context: ApprovalContext.fromJson(
          json['context'] as Map<String, dynamic>,
        ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid DeviceApproval: $error', json);
    }
  }

  final String challengeId;

  final String code;

  final DateTime requestedAt;

  final DateTime expiresAt;

  final ApprovalContext context;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'challengeId': challengeId,
    'code': code,
    'requestedAt': requestedAt.toUtc().toIso8601String(),
    'expiresAt': expiresAt.toUtc().toIso8601String(),
    'context': context.toJson(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DeviceApproval value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceApproval &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(code, other.code) &&
          contractEquals(requestedAt, other.requestedAt) &&
          contractEquals(expiresAt, other.expiresAt) &&
          contractEquals(context, other.context);

  @override
  int get hashCode =>
      contractHash([challengeId, code, requestedAt, expiresAt, context]);
}

/// Pending approvals of a device.
@immutable
final class DeviceApprovals {
  const DeviceApprovals({required this.approvals});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DeviceApprovals.fromJson(Map<String, dynamic> json) {
    try {
      return DeviceApprovals(
        approvals: [
          for (final e0 in json['approvals'] as List<dynamic>)
            DeviceApproval.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid DeviceApprovals: $error', json);
    }
  }

  final List<DeviceApproval> approvals;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'approvals': [for (final e0 in approvals) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DeviceApprovals value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceApprovals && contractEquals(approvals, other.approvals);

  @override
  int get hashCode => contractHash([approvals]);
}

/// TOTP secret and URI for the authenticator app.
@immutable
final class TotpEnrollment {
  const TotpEnrollment({required this.secret, required this.otpauthUri});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TotpEnrollment.fromJson(Map<String, dynamic> json) {
    try {
      return TotpEnrollment(
        secret: json['secret'] as String,
        otpauthUri: json['otpauthUri'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TotpEnrollment: $error', json);
    }
  }

  final String secret;

  final String otpauthUri;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'secret': secret,
    'otpauthUri': otpauthUri,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TotpEnrollment value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TotpEnrollment &&
          contractEquals(secret, other.secret) &&
          contractEquals(otpauthUri, other.otpauthUri);

  @override
  int get hashCode => contractHash([secret, otpauthUri]);
}

/// First code from the authenticator app to confirm the TOTP.
@immutable
final class TotpConfirmRequest {
  const TotpConfirmRequest({required this.code});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TotpConfirmRequest.fromJson(Map<String, dynamic> json) {
    try {
      return TotpConfirmRequest(code: json['code'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid TotpConfirmRequest: $error', json);
    }
  }

  final String code;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'code': code};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TotpConfirmRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TotpConfirmRequest && contractEquals(code, other.code);

  @override
  int get hashCode => contractHash([code]);
}

/// Recovery codes, shown only once.
@immutable
final class RecoveryCodes {
  const RecoveryCodes({required this.codes});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RecoveryCodes.fromJson(Map<String, dynamic> json) {
    try {
      return RecoveryCodes(
        codes: [for (final e0 in json['codes'] as List<dynamic>) e0 as String],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid RecoveryCodes: $error', json);
    }
  }

  final List<String> codes;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'codes': codes};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RecoveryCodes value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RecoveryCodes && contractEquals(codes, other.codes);

  @override
  int get hashCode => contractHash([codes]);
}

/// Start of the recovery of an account without available factors.
@immutable
final class MfaRecoveryStartRequest {
  const MfaRecoveryStartRequest({required this.mfaToken});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MfaRecoveryStartRequest.fromJson(Map<String, dynamic> json) {
    try {
      return MfaRecoveryStartRequest(mfaToken: json['mfaToken'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid MfaRecoveryStartRequest: $error', json);
    }
  }

  final String mfaToken;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'mfaToken': mfaToken};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MfaRecoveryStartRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MfaRecoveryStartRequest &&
          contractEquals(mfaToken, other.mfaToken);

  @override
  int get hashCode => contractHash([mfaToken]);
}

/// Recovery started.
@immutable
final class MfaRecoveryStarted {
  const MfaRecoveryStarted({required this.availableAt});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MfaRecoveryStarted.fromJson(Map<String, dynamic> json) {
    try {
      return MfaRecoveryStarted(
        availableAt: DateTime.parse(json['availableAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MfaRecoveryStarted: $error', json);
    }
  }

  final DateTime availableAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'availableAt': availableAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MfaRecoveryStarted value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MfaRecoveryStarted &&
          contractEquals(availableAt, other.availableAt);

  @override
  int get hashCode => contractHash([availableAt]);
}

/// Confirmation of the recovery with the token sent by email.
@immutable
final class MfaRecoveryConfirmRequest {
  const MfaRecoveryConfirmRequest({
    required this.mfaToken,
    required this.token,
    this.devicePublicKey,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MfaRecoveryConfirmRequest.fromJson(Map<String, dynamic> json) {
    try {
      return MfaRecoveryConfirmRequest(
        mfaToken: json['mfaToken'] as String,
        token: json['token'] as String,
        devicePublicKey: json['devicePublicKey'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MfaRecoveryConfirmRequest: $error', json);
    }
  }

  final String mfaToken;

  final String token;

  final String? devicePublicKey;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'token': token,
    'devicePublicKey': ?devicePublicKey,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MfaRecoveryConfirmRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MfaRecoveryConfirmRequest &&
          contractEquals(mfaToken, other.mfaToken) &&
          contractEquals(token, other.token) &&
          contractEquals(devicePublicKey, other.devicePublicKey);

  @override
  int get hashCode => contractHash([mfaToken, token, devicePublicKey]);
}

/// WebAuthn options and the challenge that identifies them.
@immutable
final class PasskeyOptions {
  const PasskeyOptions({required this.challengeId, required this.optionsJson});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasskeyOptions.fromJson(Map<String, dynamic> json) {
    try {
      return PasskeyOptions(
        challengeId: json['challengeId'] as String,
        optionsJson: json['optionsJson'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PasskeyOptions: $error', json);
    }
  }

  final String challengeId;

  final String optionsJson;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'challengeId': challengeId,
    'optionsJson': optionsJson,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasskeyOptions value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasskeyOptions &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(optionsJson, other.optionsJson);

  @override
  int get hashCode => contractHash([challengeId, optionsJson]);
}

/// Verification of a passkey sign-in.
@immutable
final class PasskeySignInVerifyRequest {
  const PasskeySignInVerifyRequest({
    required this.challengeId,
    required this.credentialJson,
    this.device,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasskeySignInVerifyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PasskeySignInVerifyRequest(
        challengeId: json['challengeId'] as String,
        credentialJson: json['credentialJson'] as String,
        device: json['device'] == null
            ? null
            : DeviceSignatureFields.fromJson(
                json['device'] as Map<String, dynamic>,
              ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PasskeySignInVerifyRequest: $error', json);
    }
  }

  final String challengeId;

  final String credentialJson;

  final DeviceSignatureFields? device;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'challengeId': challengeId,
    'credentialJson': credentialJson,
    if (device case final value?) 'device': value.toJson(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasskeySignInVerifyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasskeySignInVerifyRequest &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(credentialJson, other.credentialJson) &&
          contractEquals(device, other.device);

  @override
  int get hashCode => contractHash([challengeId, credentialJson, device]);
}

/// Passkey options as the second factor of a pending sign-in.
@immutable
final class PasskeyMfaOptionsRequest {
  const PasskeyMfaOptionsRequest({required this.mfaToken});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasskeyMfaOptionsRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PasskeyMfaOptionsRequest(mfaToken: json['mfaToken'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid PasskeyMfaOptionsRequest: $error', json);
    }
  }

  final String mfaToken;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'mfaToken': mfaToken};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasskeyMfaOptionsRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasskeyMfaOptionsRequest &&
          contractEquals(mfaToken, other.mfaToken);

  @override
  int get hashCode => contractHash([mfaToken]);
}

/// Passkey verification as the second factor of a pending sign-in.
@immutable
final class PasskeyMfaVerifyRequest {
  const PasskeyMfaVerifyRequest({
    required this.mfaToken,
    required this.challengeId,
    required this.credentialJson,
    this.devicePublicKey,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasskeyMfaVerifyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PasskeyMfaVerifyRequest(
        mfaToken: json['mfaToken'] as String,
        challengeId: json['challengeId'] as String,
        credentialJson: json['credentialJson'] as String,
        devicePublicKey: json['devicePublicKey'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PasskeyMfaVerifyRequest: $error', json);
    }
  }

  final String mfaToken;

  final String challengeId;

  final String credentialJson;

  final String? devicePublicKey;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'challengeId': challengeId,
    'credentialJson': credentialJson,
    'devicePublicKey': ?devicePublicKey,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasskeyMfaVerifyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasskeyMfaVerifyRequest &&
          contractEquals(mfaToken, other.mfaToken) &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(credentialJson, other.credentialJson) &&
          contractEquals(devicePublicKey, other.devicePublicKey);

  @override
  int get hashCode =>
      contractHash([mfaToken, challengeId, credentialJson, devicePublicKey]);
}

/// Passkey options for the step-up of an open session.
@immutable
final class PasskeyStepUpOptionsRequest {
  const PasskeyStepUpOptionsRequest({required this.mfaToken});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasskeyStepUpOptionsRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PasskeyStepUpOptionsRequest(mfaToken: json['mfaToken'] as String);
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid PasskeyStepUpOptionsRequest: $error',
        json,
      );
    }
  }

  final String mfaToken;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'mfaToken': mfaToken};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasskeyStepUpOptionsRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasskeyStepUpOptionsRequest &&
          contractEquals(mfaToken, other.mfaToken);

  @override
  int get hashCode => contractHash([mfaToken]);
}

/// Passkey verification for the step-up of an open session.
@immutable
final class PasskeyStepUpVerifyRequest {
  const PasskeyStepUpVerifyRequest({
    required this.mfaToken,
    required this.challengeId,
    required this.credentialJson,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasskeyStepUpVerifyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return PasskeyStepUpVerifyRequest(
        mfaToken: json['mfaToken'] as String,
        challengeId: json['challengeId'] as String,
        credentialJson: json['credentialJson'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PasskeyStepUpVerifyRequest: $error', json);
    }
  }

  final String mfaToken;

  final String challengeId;

  final String credentialJson;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'mfaToken': mfaToken,
    'challengeId': challengeId,
    'credentialJson': credentialJson,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasskeyStepUpVerifyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasskeyStepUpVerifyRequest &&
          contractEquals(mfaToken, other.mfaToken) &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(credentialJson, other.credentialJson);

  @override
  int get hashCode => contractHash([mfaToken, challengeId, credentialJson]);
}

/// Registered passkey of the user.
@immutable
final class PasskeySummary {
  const PasskeySummary({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.lastUsedAt,
    required this.backedUp,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasskeySummary.fromJson(Map<String, dynamic> json) {
    try {
      return PasskeySummary(
        id: json['id'] as String,
        name: json['name'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        lastUsedAt: json['lastUsedAt'] == null
            ? null
            : DateTime.parse(json['lastUsedAt'] as String),
        backedUp: json['backedUp'] as bool,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PasskeySummary: $error', json);
    }
  }

  final String id;

  final String name;

  final DateTime createdAt;

  final DateTime? lastUsedAt;

  final bool backedUp;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'lastUsedAt': switch (lastUsedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'backedUp': backedUp,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasskeySummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasskeySummary &&
          contractEquals(id, other.id) &&
          contractEquals(name, other.name) &&
          contractEquals(createdAt, other.createdAt) &&
          contractEquals(lastUsedAt, other.lastUsedAt) &&
          contractEquals(backedUp, other.backedUp);

  @override
  int get hashCode => contractHash([id, name, createdAt, lastUsedAt, backedUp]);
}

/// Page of passkeys.
@immutable
final class PasskeyPage {
  const PasskeyPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PasskeyPage.fromJson(Map<String, dynamic> json) {
    try {
      return PasskeyPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            PasskeySummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PasskeyPage: $error', json);
    }
  }

  final List<PasskeySummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PasskeyPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PasskeyPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Registration of a passkey with the authenticator response.
@immutable
final class RegisterPasskeyRequest {
  const RegisterPasskeyRequest({
    required this.challengeId,
    required this.credentialJson,
    required this.name,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RegisterPasskeyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RegisterPasskeyRequest(
        challengeId: json['challengeId'] as String,
        credentialJson: json['credentialJson'] as String,
        name: json['name'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid RegisterPasskeyRequest: $error', json);
    }
  }

  final String challengeId;

  final String credentialJson;

  final String name;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'challengeId': challengeId,
    'credentialJson': credentialJson,
    'name': name,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RegisterPasskeyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RegisterPasskeyRequest &&
          contractEquals(challengeId, other.challengeId) &&
          contractEquals(credentialJson, other.credentialJson) &&
          contractEquals(name, other.name);

  @override
  int get hashCode => contractHash([challengeId, credentialJson, name]);
}

/// Passkey to remove.
@immutable
final class RemovePasskeyRequest {
  const RemovePasskeyRequest({required this.passkeyId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RemovePasskeyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RemovePasskeyRequest(passkeyId: json['passkeyId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid RemovePasskeyRequest: $error', json);
    }
  }

  final String passkeyId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'passkeyId': passkeyId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RemovePasskeyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RemovePasskeyRequest &&
          contractEquals(passkeyId, other.passkeyId);

  @override
  int get hashCode => contractHash([passkeyId]);
}

/// Tenant visible to its members.
@immutable
final class TenantSummary {
  const TenantSummary({
    required this.id,
    required this.slug,
    required this.name,
    required this.region,
    required this.kind,
    required this.status,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantSummary.fromJson(Map<String, dynamic> json) {
    try {
      return TenantSummary(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: json['name'] as String,
        region: json['region'] as String,
        kind: decodeEnum(json['kind'], TenantKind.tryParse, 'TenantKind'),
        status: decodeEnum(
          json['status'],
          TenantLifecycle.tryParse,
          'TenantLifecycle',
        ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantSummary: $error', json);
    }
  }

  final String id;

  final String slug;

  final String name;

  final String region;

  final TenantKind kind;

  final TenantLifecycle status;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'slug': slug,
    'name': name,
    'region': region,
    'kind': kind.wireCode,
    'status': status.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantSummary &&
          contractEquals(id, other.id) &&
          contractEquals(slug, other.slug) &&
          contractEquals(name, other.name) &&
          contractEquals(region, other.region) &&
          contractEquals(kind, other.kind) &&
          contractEquals(status, other.status);

  @override
  int get hashCode => contractHash([id, slug, name, region, kind, status]);
}

/// Creation of a tenant by the user.
@immutable
final class CreateTenantRequest {
  const CreateTenantRequest({
    required this.slug,
    required this.name,
    this.region,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CreateTenantRequest.fromJson(Map<String, dynamic> json) {
    try {
      return CreateTenantRequest(
        slug: json['slug'] as String,
        name: json['name'] as String,
        region: json['region'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid CreateTenantRequest: $error', json);
    }
  }

  final String slug;

  final String name;

  final String? region;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'slug': slug,
    'name': name,
    'region': ?region,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CreateTenantRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateTenantRequest &&
          contractEquals(slug, other.slug) &&
          contractEquals(name, other.name) &&
          contractEquals(region, other.region);

  @override
  int get hashCode => contractHash([slug, name, region]);
}

/// Partial changes of the current tenant.
@immutable
final class UpdateTenantRequest {
  const UpdateTenantRequest({this.name});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UpdateTenantRequest.fromJson(Map<String, dynamic> json) {
    try {
      return UpdateTenantRequest(name: json['name'] as String?);
    } on TypeError catch (error) {
      throw FormatException('Invalid UpdateTenantRequest: $error', json);
    }
  }

  final String? name;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'name': ?name};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UpdateTenantRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateTenantRequest && contractEquals(name, other.name);

  @override
  int get hashCode => contractHash([name]);
}

/// Tenant of the user with the date they joined.
@immutable
final class MyTenantSummary {
  const MyTenantSummary({
    required this.id,
    required this.slug,
    required this.name,
    required this.kind,
    required this.status,
    required this.joinedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MyTenantSummary.fromJson(Map<String, dynamic> json) {
    try {
      return MyTenantSummary(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: json['name'] as String,
        kind: decodeEnum(json['kind'], TenantKind.tryParse, 'TenantKind'),
        status: decodeEnum(
          json['status'],
          TenantLifecycle.tryParse,
          'TenantLifecycle',
        ),
        joinedAt: DateTime.parse(json['joinedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MyTenantSummary: $error', json);
    }
  }

  final String id;

  final String slug;

  final String name;

  final TenantKind kind;

  final TenantLifecycle status;

  final DateTime joinedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'slug': slug,
    'name': name,
    'kind': kind.wireCode,
    'status': status.wireCode,
    'joinedAt': joinedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MyTenantSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MyTenantSummary &&
          contractEquals(id, other.id) &&
          contractEquals(slug, other.slug) &&
          contractEquals(name, other.name) &&
          contractEquals(kind, other.kind) &&
          contractEquals(status, other.status) &&
          contractEquals(joinedAt, other.joinedAt);

  @override
  int get hashCode => contractHash([id, slug, name, kind, status, joinedAt]);
}

/// Page of the user tenants.
@immutable
final class MyTenantPage {
  const MyTenantPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MyTenantPage.fromJson(Map<String, dynamic> json) {
    try {
      return MyTenantPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            MyTenantSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MyTenantPage: $error', json);
    }
  }

  final List<MyTenantSummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MyTenantPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MyTenantPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Tenant the open session switches to.
@immutable
final class SwitchTenantRequest {
  const SwitchTenantRequest({required this.tenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SwitchTenantRequest.fromJson(Map<String, dynamic> json) {
    try {
      return SwitchTenantRequest(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid SwitchTenantRequest: $error', json);
    }
  }

  final String tenantId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SwitchTenantRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SwitchTenantRequest && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Result of an operation on the lifecycle of a tenant.
@immutable
final class TenantOperationResult {
  const TenantOperationResult({required this.tenantId, required this.status});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantOperationResult.fromJson(Map<String, dynamic> json) {
    try {
      return TenantOperationResult(
        tenantId: json['tenantId'] as String,
        status: decodeEnum(
          json['status'],
          TenantLifecycle.tryParse,
          'TenantLifecycle',
        ),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantOperationResult: $error', json);
    }
  }

  final String tenantId;

  final TenantLifecycle status;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'status': status.wireCode,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantOperationResult value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantOperationResult &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(status, other.status);

  @override
  int get hashCode => contractHash([tenantId, status]);
}

/// Creates a tenant being provisioned with its owner.
@immutable
final class CreateTenantInput {
  const CreateTenantInput({
    required this.tenantId,
    required this.slug,
    required this.name,
    required this.region,
    required this.kind,
    required this.ownerUserId,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CreateTenantInput.fromJson(Map<String, dynamic> json) {
    try {
      return CreateTenantInput(
        tenantId: json['tenantId'] as String,
        slug: json['slug'] as String,
        name: json['name'] as String,
        region: json['region'] as String,
        kind: decodeEnum(json['kind'], TenantKind.tryParse, 'TenantKind'),
        ownerUserId: json['ownerUserId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid CreateTenantInput: $error', json);
    }
  }

  final String tenantId;

  final String slug;

  final String name;

  final String region;

  final TenantKind kind;

  final String ownerUserId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'slug': slug,
    'name': name,
    'region': region,
    'kind': kind.wireCode,
    'ownerUserId': ownerUserId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CreateTenantInput value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateTenantInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(slug, other.slug) &&
          contractEquals(name, other.name) &&
          contractEquals(region, other.region) &&
          contractEquals(kind, other.kind) &&
          contractEquals(ownerUserId, other.ownerUserId);

  @override
  int get hashCode =>
      contractHash([tenantId, slug, name, region, kind, ownerUserId]);
}

/// Tenant to query or change.
@immutable
final class TenantRefInput {
  const TenantRefInput({required this.tenantId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantRefInput.fromJson(Map<String, dynamic> json) {
    try {
      return TenantRefInput(tenantId: json['tenantId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantRefInput: $error', json);
    }
  }

  final String tenantId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'tenantId': tenantId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantRefInput value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantRefInput && contractEquals(tenantId, other.tenantId);

  @override
  int get hashCode => contractHash([tenantId]);
}

/// Suspends a tenant and revokes its tokens.
@immutable
final class SuspendTenantInput {
  const SuspendTenantInput({required this.tenantId, this.reason});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SuspendTenantInput.fromJson(Map<String, dynamic> json) {
    try {
      return SuspendTenantInput(
        tenantId: json['tenantId'] as String,
        reason: json['reason'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SuspendTenantInput: $error', json);
    }
  }

  final String tenantId;

  final String? reason;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'reason': ?reason,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SuspendTenantInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SuspendTenantInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(reason, other.reason);

  @override
  int get hashCode => contractHash([tenantId, reason]);
}

/// Tenant member with their groups.
@immutable
final class MemberSummary {
  const MemberSummary({
    required this.userId,
    required this.email,
    required this.displayName,
    required this.groupIds,
    required this.joinedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MemberSummary.fromJson(Map<String, dynamic> json) {
    try {
      return MemberSummary(
        userId: json['userId'] as String,
        email: json['email'] as String,
        displayName: json['displayName'] as String,
        groupIds: [
          for (final e0 in json['groupIds'] as List<dynamic>) e0 as String,
        ],
        joinedAt: DateTime.parse(json['joinedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MemberSummary: $error', json);
    }
  }

  final String userId;

  final String email;

  final String displayName;

  final List<String> groupIds;

  final DateTime joinedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'email': email,
    'displayName': displayName,
    'groupIds': groupIds,
    'joinedAt': joinedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MemberSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MemberSummary &&
          contractEquals(userId, other.userId) &&
          contractEquals(email, other.email) &&
          contractEquals(displayName, other.displayName) &&
          contractEquals(groupIds, other.groupIds) &&
          contractEquals(joinedAt, other.joinedAt);

  @override
  int get hashCode =>
      contractHash([userId, email, displayName, groupIds, joinedAt]);
}

/// Page of members.
@immutable
final class MemberPage {
  const MemberPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MemberPage.fromJson(Map<String, dynamic> json) {
    try {
      return MemberPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            MemberSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MemberPage: $error', json);
    }
  }

  final List<MemberSummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MemberPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MemberPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Member to remove from the tenant.
@immutable
final class RemoveMemberRequest {
  const RemoveMemberRequest({required this.userId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RemoveMemberRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RemoveMemberRequest(userId: json['userId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid RemoveMemberRequest: $error', json);
    }
  }

  final String userId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'userId': userId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RemoveMemberRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RemoveMemberRequest && contractEquals(userId, other.userId);

  @override
  int get hashCode => contractHash([userId]);
}

/// Replacement of the groups of a member.
@immutable
final class SetMemberGroupsRequest {
  const SetMemberGroupsRequest({required this.userId, required this.groupIds});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SetMemberGroupsRequest.fromJson(Map<String, dynamic> json) {
    try {
      return SetMemberGroupsRequest(
        userId: json['userId'] as String,
        groupIds: [
          for (final e0 in json['groupIds'] as List<dynamic>) e0 as String,
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SetMemberGroupsRequest: $error', json);
    }
  }

  final String userId;

  final List<String> groupIds;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'groupIds': groupIds,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SetMemberGroupsRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SetMemberGroupsRequest &&
          contractEquals(userId, other.userId) &&
          contractEquals(groupIds, other.groupIds);

  @override
  int get hashCode => contractHash([userId, groupIds]);
}

/// Tenant group.
@immutable
final class GroupSummary {
  const GroupSummary({
    required this.id,
    required this.name,
    required this.system,
    required this.roleIds,
    required this.memberCount,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory GroupSummary.fromJson(Map<String, dynamic> json) {
    try {
      return GroupSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        system: json['system'] as bool,
        roleIds: [
          for (final e0 in json['roleIds'] as List<dynamic>) e0 as String,
        ],
        memberCount: (json['memberCount'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid GroupSummary: $error', json);
    }
  }

  final String id;

  final String name;

  final bool system;

  final List<String> roleIds;

  final int memberCount;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'system': system,
    'roleIds': roleIds,
    'memberCount': memberCount,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(GroupSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GroupSummary &&
          contractEquals(id, other.id) &&
          contractEquals(name, other.name) &&
          contractEquals(system, other.system) &&
          contractEquals(roleIds, other.roleIds) &&
          contractEquals(memberCount, other.memberCount);

  @override
  int get hashCode => contractHash([id, name, system, roleIds, memberCount]);
}

/// Page of groups.
@immutable
final class GroupPage {
  const GroupPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory GroupPage.fromJson(Map<String, dynamic> json) {
    try {
      return GroupPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            GroupSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid GroupPage: $error', json);
    }
  }

  final List<GroupSummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(GroupPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GroupPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Group creation.
@immutable
final class CreateGroupRequest {
  const CreateGroupRequest({required this.name});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CreateGroupRequest.fromJson(Map<String, dynamic> json) {
    try {
      return CreateGroupRequest(name: json['name'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid CreateGroupRequest: $error', json);
    }
  }

  final String name;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'name': name};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CreateGroupRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateGroupRequest && contractEquals(name, other.name);

  @override
  int get hashCode => contractHash([name]);
}

/// Group rename.
@immutable
final class UpdateGroupRequest {
  const UpdateGroupRequest({required this.groupId, required this.name});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UpdateGroupRequest.fromJson(Map<String, dynamic> json) {
    try {
      return UpdateGroupRequest(
        groupId: json['groupId'] as String,
        name: json['name'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UpdateGroupRequest: $error', json);
    }
  }

  final String groupId;

  final String name;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'groupId': groupId,
    'name': name,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UpdateGroupRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateGroupRequest &&
          contractEquals(groupId, other.groupId) &&
          contractEquals(name, other.name);

  @override
  int get hashCode => contractHash([groupId, name]);
}

/// Group deletion.
@immutable
final class DeleteGroupRequest {
  const DeleteGroupRequest({required this.groupId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DeleteGroupRequest.fromJson(Map<String, dynamic> json) {
    try {
      return DeleteGroupRequest(groupId: json['groupId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid DeleteGroupRequest: $error', json);
    }
  }

  final String groupId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'groupId': groupId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DeleteGroupRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeleteGroupRequest && contractEquals(groupId, other.groupId);

  @override
  int get hashCode => contractHash([groupId]);
}

/// Replacement of the roles of a group.
@immutable
final class SetGroupRolesRequest {
  const SetGroupRolesRequest({required this.groupId, required this.roleIds});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SetGroupRolesRequest.fromJson(Map<String, dynamic> json) {
    try {
      return SetGroupRolesRequest(
        groupId: json['groupId'] as String,
        roleIds: [
          for (final e0 in json['roleIds'] as List<dynamic>) e0 as String,
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SetGroupRolesRequest: $error', json);
    }
  }

  final String groupId;

  final List<String> roleIds;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'groupId': groupId,
    'roleIds': roleIds,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SetGroupRolesRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SetGroupRolesRequest &&
          contractEquals(groupId, other.groupId) &&
          contractEquals(roleIds, other.roleIds);

  @override
  int get hashCode => contractHash([groupId, roleIds]);
}

/// Tenant role with its permissions.
@immutable
final class RoleSummary {
  const RoleSummary({
    required this.id,
    required this.name,
    required this.systemRole,
    required this.permissions,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RoleSummary.fromJson(Map<String, dynamic> json) {
    try {
      return RoleSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        systemRole: json['systemRole'] == null
            ? null
            : decodeEnum(json['systemRole'], TenantRole.tryParse, 'TenantRole'),
        permissions: [
          for (final e0 in json['permissions'] as List<dynamic>) e0 as String,
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid RoleSummary: $error', json);
    }
  }

  final String id;

  final String name;

  final TenantRole? systemRole;

  final List<String> permissions;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'systemRole': switch (systemRole) {
      final value? => value.wireCode,
      null => null,
    },
    'permissions': permissions,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RoleSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RoleSummary &&
          contractEquals(id, other.id) &&
          contractEquals(name, other.name) &&
          contractEquals(systemRole, other.systemRole) &&
          contractEquals(permissions, other.permissions);

  @override
  int get hashCode => contractHash([id, name, systemRole, permissions]);
}

/// Page of roles.
@immutable
final class RolePage {
  const RolePage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RolePage.fromJson(Map<String, dynamic> json) {
    try {
      return RolePage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            RoleSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid RolePage: $error', json);
    }
  }

  final List<RoleSummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RolePage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RolePage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Custom role creation.
@immutable
final class CreateRoleRequest {
  const CreateRoleRequest({required this.name, required this.permissions});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CreateRoleRequest.fromJson(Map<String, dynamic> json) {
    try {
      return CreateRoleRequest(
        name: json['name'] as String,
        permissions: [
          for (final e0 in json['permissions'] as List<dynamic>) e0 as String,
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid CreateRoleRequest: $error', json);
    }
  }

  final String name;

  final List<String> permissions;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'name': name,
    'permissions': permissions,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CreateRoleRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateRoleRequest &&
          contractEquals(name, other.name) &&
          contractEquals(permissions, other.permissions);

  @override
  int get hashCode => contractHash([name, permissions]);
}

/// Partial changes of a role.
@immutable
final class UpdateRoleRequest {
  const UpdateRoleRequest({required this.roleId, this.name, this.permissions});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UpdateRoleRequest.fromJson(Map<String, dynamic> json) {
    try {
      return UpdateRoleRequest(
        roleId: json['roleId'] as String,
        name: json['name'] as String?,
        permissions: json['permissions'] == null
            ? null
            : [
                for (final e0 in json['permissions'] as List<dynamic>)
                  e0 as String,
              ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UpdateRoleRequest: $error', json);
    }
  }

  final String roleId;

  final String? name;

  final List<String>? permissions;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'roleId': roleId,
    'name': ?name,
    'permissions': ?permissions,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UpdateRoleRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateRoleRequest &&
          contractEquals(roleId, other.roleId) &&
          contractEquals(name, other.name) &&
          contractEquals(permissions, other.permissions);

  @override
  int get hashCode => contractHash([roleId, name, permissions]);
}

/// Role deletion.
@immutable
final class DeleteRoleRequest {
  const DeleteRoleRequest({required this.roleId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DeleteRoleRequest.fromJson(Map<String, dynamic> json) {
    try {
      return DeleteRoleRequest(roleId: json['roleId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid DeleteRoleRequest: $error', json);
    }
  }

  final String roleId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'roleId': roleId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DeleteRoleRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeleteRoleRequest && contractEquals(roleId, other.roleId);

  @override
  int get hashCode => contractHash([roleId]);
}

/// Invitation to a tenant.
@immutable
final class InvitationSummary {
  const InvitationSummary({
    required this.id,
    required this.email,
    required this.groupIds,
    required this.status,
    required this.expiresAt,
    required this.invitedBy,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvitationSummary.fromJson(Map<String, dynamic> json) {
    try {
      return InvitationSummary(
        id: json['id'] as String,
        email: json['email'] as String,
        groupIds: [
          for (final e0 in json['groupIds'] as List<dynamic>) e0 as String,
        ],
        status: decodeEnum(
          json['status'],
          InvitationStatus.tryParse,
          'InvitationStatus',
        ),
        expiresAt: DateTime.parse(json['expiresAt'] as String),
        invitedBy: json['invitedBy'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvitationSummary: $error', json);
    }
  }

  final String id;

  final String email;

  final List<String> groupIds;

  final InvitationStatus status;

  final DateTime expiresAt;

  final String invitedBy;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'email': email,
    'groupIds': groupIds,
    'status': status.wireCode,
    'expiresAt': expiresAt.toUtc().toIso8601String(),
    'invitedBy': invitedBy,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvitationSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvitationSummary &&
          contractEquals(id, other.id) &&
          contractEquals(email, other.email) &&
          contractEquals(groupIds, other.groupIds) &&
          contractEquals(status, other.status) &&
          contractEquals(expiresAt, other.expiresAt) &&
          contractEquals(invitedBy, other.invitedBy);

  @override
  int get hashCode =>
      contractHash([id, email, groupIds, status, expiresAt, invitedBy]);
}

/// Page of invitations.
@immutable
final class InvitationPage {
  const InvitationPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InvitationPage.fromJson(Map<String, dynamic> json) {
    try {
      return InvitationPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            InvitationSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InvitationPage: $error', json);
    }
  }

  final List<InvitationSummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InvitationPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvitationPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Invitation of an email to the given groups.
@immutable
final class InviteUserRequest {
  const InviteUserRequest({required this.email, required this.groupIds});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory InviteUserRequest.fromJson(Map<String, dynamic> json) {
    try {
      return InviteUserRequest(
        email: json['email'] as String,
        groupIds: [
          for (final e0 in json['groupIds'] as List<dynamic>) e0 as String,
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid InviteUserRequest: $error', json);
    }
  }

  final String email;

  final List<String> groupIds;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'email': email,
    'groupIds': groupIds,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(InviteUserRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InviteUserRequest &&
          contractEquals(email, other.email) &&
          contractEquals(groupIds, other.groupIds);

  @override
  int get hashCode => contractHash([email, groupIds]);
}

/// Pending invitation to revoke.
@immutable
final class RevokeInvitationRequest {
  const RevokeInvitationRequest({required this.invitationId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RevokeInvitationRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RevokeInvitationRequest(
        invitationId: json['invitationId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid RevokeInvitationRequest: $error', json);
    }
  }

  final String invitationId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'invitationId': invitationId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RevokeInvitationRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RevokeInvitationRequest &&
          contractEquals(invitationId, other.invitationId);

  @override
  int get hashCode => contractHash([invitationId]);
}

/// Acceptance of an invitation with the emailed token.
@immutable
final class AcceptInvitationRequest {
  const AcceptInvitationRequest({required this.token});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory AcceptInvitationRequest.fromJson(Map<String, dynamic> json) {
    try {
      return AcceptInvitationRequest(token: json['token'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid AcceptInvitationRequest: $error', json);
    }
  }

  final String token;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'token': token};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(AcceptInvitationRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AcceptInvitationRequest && contractEquals(token, other.token);

  @override
  int get hashCode => contractHash([token]);
}

/// Non-human tenant identity that uses API keys.
@immutable
final class ServiceAccountSummary {
  const ServiceAccountSummary({
    required this.id,
    required this.name,
    required this.permissions,
    required this.status,
    required this.pinnedApiVersion,
    required this.createdAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ServiceAccountSummary.fromJson(Map<String, dynamic> json) {
    try {
      return ServiceAccountSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        permissions: [
          for (final e0 in json['permissions'] as List<dynamic>)
            ?Permission.tryParse(e0 as String),
        ],
        status: decodeEnum(
          json['status'],
          ServiceAccountStatus.tryParse,
          'ServiceAccountStatus',
        ),
        pinnedApiVersion: json['pinnedApiVersion'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ServiceAccountSummary: $error', json);
    }
  }

  final String id;

  final String name;

  final List<Permission> permissions;

  final ServiceAccountStatus status;

  final String? pinnedApiVersion;

  final DateTime createdAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'permissions': [for (final e0 in permissions) e0.wireCode],
    'status': status.wireCode,
    'pinnedApiVersion': pinnedApiVersion,
    'createdAt': createdAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ServiceAccountSummary value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ServiceAccountSummary &&
          contractEquals(id, other.id) &&
          contractEquals(name, other.name) &&
          contractEquals(permissions, other.permissions) &&
          contractEquals(status, other.status) &&
          contractEquals(pinnedApiVersion, other.pinnedApiVersion) &&
          contractEquals(createdAt, other.createdAt);

  @override
  int get hashCode => contractHash([
    id,
    name,
    permissions,
    status,
    pinnedApiVersion,
    createdAt,
  ]);
}

/// Page of service accounts.
@immutable
final class ServiceAccountPage {
  const ServiceAccountPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ServiceAccountPage.fromJson(Map<String, dynamic> json) {
    try {
      return ServiceAccountPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            ServiceAccountSummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ServiceAccountPage: $error', json);
    }
  }

  final List<ServiceAccountSummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ServiceAccountPage value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ServiceAccountPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Service account creation.
@immutable
final class CreateServiceAccountRequest {
  const CreateServiceAccountRequest({
    required this.name,
    required this.permissions,
    this.pinnedApiVersion,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CreateServiceAccountRequest.fromJson(Map<String, dynamic> json) {
    try {
      return CreateServiceAccountRequest(
        name: json['name'] as String,
        permissions: [
          for (final e0 in json['permissions'] as List<dynamic>)
            ?Permission.tryParse(e0 as String),
        ],
        pinnedApiVersion: json['pinnedApiVersion'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid CreateServiceAccountRequest: $error',
        json,
      );
    }
  }

  final String name;

  final List<Permission> permissions;

  final String? pinnedApiVersion;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'name': name,
    'permissions': [for (final e0 in permissions) e0.wireCode],
    'pinnedApiVersion': ?pinnedApiVersion,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CreateServiceAccountRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateServiceAccountRequest &&
          contractEquals(name, other.name) &&
          contractEquals(permissions, other.permissions) &&
          contractEquals(pinnedApiVersion, other.pinnedApiVersion);

  @override
  int get hashCode => contractHash([name, permissions, pinnedApiVersion]);
}

/// Partial changes of a service account.
@immutable
final class UpdateServiceAccountRequest {
  const UpdateServiceAccountRequest({
    required this.serviceAccountId,
    this.name,
    this.permissions,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UpdateServiceAccountRequest.fromJson(Map<String, dynamic> json) {
    try {
      return UpdateServiceAccountRequest(
        serviceAccountId: json['serviceAccountId'] as String,
        name: json['name'] as String?,
        permissions: json['permissions'] == null
            ? null
            : [
                for (final e0 in json['permissions'] as List<dynamic>)
                  ?Permission.tryParse(e0 as String),
              ],
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid UpdateServiceAccountRequest: $error',
        json,
      );
    }
  }

  final String serviceAccountId;

  final String? name;

  final List<Permission>? permissions;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'serviceAccountId': serviceAccountId,
    'name': ?name,
    if (permissions case final value?)
      'permissions': [for (final e0 in value) e0.wireCode],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UpdateServiceAccountRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateServiceAccountRequest &&
          contractEquals(serviceAccountId, other.serviceAccountId) &&
          contractEquals(name, other.name) &&
          contractEquals(permissions, other.permissions);

  @override
  int get hashCode => contractHash([serviceAccountId, name, permissions]);
}

/// Deletion of a service account with its API keys.
@immutable
final class DeleteServiceAccountRequest {
  const DeleteServiceAccountRequest({required this.serviceAccountId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DeleteServiceAccountRequest.fromJson(Map<String, dynamic> json) {
    try {
      return DeleteServiceAccountRequest(
        serviceAccountId: json['serviceAccountId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid DeleteServiceAccountRequest: $error',
        json,
      );
    }
  }

  final String serviceAccountId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'serviceAccountId': serviceAccountId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DeleteServiceAccountRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeleteServiceAccountRequest &&
          contractEquals(serviceAccountId, other.serviceAccountId);

  @override
  int get hashCode => contractHash([serviceAccountId]);
}

/// API key without its secret.
@immutable
final class ApiKeySummary {
  const ApiKeySummary({
    required this.id,
    required this.serviceAccountId,
    required this.prefix,
    required this.environment,
    required this.status,
    required this.expiresAt,
    required this.validUntil,
    required this.allowedCidrs,
    required this.lastUsedAt,
    required this.createdAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ApiKeySummary.fromJson(Map<String, dynamic> json) {
    try {
      return ApiKeySummary(
        id: json['id'] as String,
        serviceAccountId: json['serviceAccountId'] as String,
        prefix: json['prefix'] as String,
        environment: decodeEnum(
          json['environment'],
          ApiKeyEnvironment.tryParse,
          'ApiKeyEnvironment',
        ),
        status: decodeEnum(
          json['status'],
          ApiKeyStatus.tryParse,
          'ApiKeyStatus',
        ),
        expiresAt: json['expiresAt'] == null
            ? null
            : DateTime.parse(json['expiresAt'] as String),
        validUntil: json['validUntil'] == null
            ? null
            : DateTime.parse(json['validUntil'] as String),
        allowedCidrs: [
          for (final e0 in json['allowedCidrs'] as List<dynamic>) e0 as String,
        ],
        lastUsedAt: json['lastUsedAt'] == null
            ? null
            : DateTime.parse(json['lastUsedAt'] as String),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ApiKeySummary: $error', json);
    }
  }

  final String id;

  final String serviceAccountId;

  final String prefix;

  final ApiKeyEnvironment environment;

  final ApiKeyStatus status;

  final DateTime? expiresAt;

  final DateTime? validUntil;

  final List<String> allowedCidrs;

  final DateTime? lastUsedAt;

  final DateTime createdAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'serviceAccountId': serviceAccountId,
    'prefix': prefix,
    'environment': environment.wireCode,
    'status': status.wireCode,
    'expiresAt': switch (expiresAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'validUntil': switch (validUntil) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'allowedCidrs': allowedCidrs,
    'lastUsedAt': switch (lastUsedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'createdAt': createdAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ApiKeySummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApiKeySummary &&
          contractEquals(id, other.id) &&
          contractEquals(serviceAccountId, other.serviceAccountId) &&
          contractEquals(prefix, other.prefix) &&
          contractEquals(environment, other.environment) &&
          contractEquals(status, other.status) &&
          contractEquals(expiresAt, other.expiresAt) &&
          contractEquals(validUntil, other.validUntil) &&
          contractEquals(allowedCidrs, other.allowedCidrs) &&
          contractEquals(lastUsedAt, other.lastUsedAt) &&
          contractEquals(createdAt, other.createdAt);

  @override
  int get hashCode => contractHash([
    id,
    serviceAccountId,
    prefix,
    environment,
    status,
    expiresAt,
    validUntil,
    allowedCidrs,
    lastUsedAt,
    createdAt,
  ]);
}

/// Page of API keys.
@immutable
final class ApiKeyPage {
  const ApiKeyPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ApiKeyPage.fromJson(Map<String, dynamic> json) {
    try {
      return ApiKeyPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            ApiKeySummary.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ApiKeyPage: $error', json);
    }
  }

  final List<ApiKeySummary> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ApiKeyPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApiKeyPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Listing of the API keys of a service account.
@immutable
final class ListApiKeysRequest {
  const ListApiKeysRequest({
    required this.serviceAccountId,
    this.limit,
    this.after,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ListApiKeysRequest.fromJson(Map<String, dynamic> json) {
    try {
      return ListApiKeysRequest(
        serviceAccountId: json['serviceAccountId'] as String,
        limit: json['limit'] == null ? null : (json['limit'] as num).toInt(),
        after: json['after'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ListApiKeysRequest: $error', json);
    }
  }

  final String serviceAccountId;

  final int? limit;

  final String? after;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'serviceAccountId': serviceAccountId,
    'limit': ?limit,
    'after': ?after,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ListApiKeysRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ListApiKeysRequest &&
          contractEquals(serviceAccountId, other.serviceAccountId) &&
          contractEquals(limit, other.limit) &&
          contractEquals(after, other.after);

  @override
  int get hashCode => contractHash([serviceAccountId, limit, after]);
}

/// API key creation.
@immutable
final class CreateApiKeyRequest {
  const CreateApiKeyRequest({
    required this.serviceAccountId,
    required this.environment,
    this.expiresAt,
    this.allowedCidrs,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CreateApiKeyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return CreateApiKeyRequest(
        serviceAccountId: json['serviceAccountId'] as String,
        environment: decodeEnum(
          json['environment'],
          ApiKeyEnvironment.tryParse,
          'ApiKeyEnvironment',
        ),
        expiresAt: json['expiresAt'] == null
            ? null
            : DateTime.parse(json['expiresAt'] as String),
        allowedCidrs: json['allowedCidrs'] == null
            ? null
            : [
                for (final e0 in json['allowedCidrs'] as List<dynamic>)
                  e0 as String,
              ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid CreateApiKeyRequest: $error', json);
    }
  }

  final String serviceAccountId;

  final ApiKeyEnvironment environment;

  final DateTime? expiresAt;

  final List<String>? allowedCidrs;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'serviceAccountId': serviceAccountId,
    'environment': environment.wireCode,
    if (expiresAt case final value?)
      'expiresAt': value.toUtc().toIso8601String(),
    'allowedCidrs': ?allowedCidrs,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CreateApiKeyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateApiKeyRequest &&
          contractEquals(serviceAccountId, other.serviceAccountId) &&
          contractEquals(environment, other.environment) &&
          contractEquals(expiresAt, other.expiresAt) &&
          contractEquals(allowedCidrs, other.allowedCidrs);

  @override
  int get hashCode =>
      contractHash([serviceAccountId, environment, expiresAt, allowedCidrs]);
}

/// API key created. The secret appears only in this response.
@immutable
final class CreatedApiKey {
  const CreatedApiKey({required this.apiKey, required this.secret});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory CreatedApiKey.fromJson(Map<String, dynamic> json) {
    try {
      return CreatedApiKey(
        apiKey: ApiKeySummary.fromJson(json['apiKey'] as Map<String, dynamic>),
        secret: json['secret'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid CreatedApiKey: $error', json);
    }
  }

  final ApiKeySummary apiKey;

  final String secret;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'apiKey': apiKey.toJson(),
    'secret': secret,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(CreatedApiKey value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreatedApiKey &&
          contractEquals(apiKey, other.apiKey) &&
          contractEquals(secret, other.secret);

  @override
  int get hashCode => contractHash([apiKey, secret]);
}

/// Rotation of an API key.
@immutable
final class RotateApiKeyRequest {
  const RotateApiKeyRequest({required this.apiKeyId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RotateApiKeyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RotateApiKeyRequest(apiKeyId: json['apiKeyId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid RotateApiKeyRequest: $error', json);
    }
  }

  final String apiKeyId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'apiKeyId': apiKeyId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RotateApiKeyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RotateApiKeyRequest && contractEquals(apiKeyId, other.apiKeyId);

  @override
  int get hashCode => contractHash([apiKeyId]);
}

/// Immediate revocation of an API key.
@immutable
final class RevokeApiKeyRequest {
  const RevokeApiKeyRequest({required this.apiKeyId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory RevokeApiKeyRequest.fromJson(Map<String, dynamic> json) {
    try {
      return RevokeApiKeyRequest(apiKeyId: json['apiKeyId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid RevokeApiKeyRequest: $error', json);
    }
  }

  final String apiKeyId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'apiKeyId': apiKeyId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(RevokeApiKeyRequest value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RevokeApiKeyRequest && contractEquals(apiKeyId, other.apiKeyId);

  @override
  int get hashCode => contractHash([apiKeyId]);
}

/// Validates an API key presented by a client.
@immutable
final class AuthenticateApiKeyInput {
  const AuthenticateApiKeyInput({required this.apiKey, this.clientIp});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory AuthenticateApiKeyInput.fromJson(Map<String, dynamic> json) {
    try {
      return AuthenticateApiKeyInput(
        apiKey: json['apiKey'] as String,
        clientIp: json['clientIp'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid AuthenticateApiKeyInput: $error', json);
    }
  }

  final String apiKey;

  final String? clientIp;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'apiKey': apiKey,
    'clientIp': ?clientIp,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(AuthenticateApiKeyInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AuthenticateApiKeyInput &&
          contractEquals(apiKey, other.apiKey) &&
          contractEquals(clientIp, other.clientIp);

  @override
  int get hashCode => contractHash([apiKey, clientIp]);
}

/// Principal resulting from validating an API key.
@immutable
final class ApiKeyPrincipal {
  const ApiKeyPrincipal({
    required this.apiKeyId,
    required this.serviceAccountId,
    required this.tenantId,
    required this.permissions,
    required this.environment,
    required this.expiresAt,
    required this.pinnedApiVersion,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ApiKeyPrincipal.fromJson(Map<String, dynamic> json) {
    try {
      return ApiKeyPrincipal(
        apiKeyId: json['apiKeyId'] as String,
        serviceAccountId: json['serviceAccountId'] as String,
        tenantId: json['tenantId'] as String,
        permissions: [
          for (final e0 in json['permissions'] as List<dynamic>)
            ?Permission.tryParse(e0 as String),
        ],
        environment: decodeEnum(
          json['environment'],
          ApiKeyEnvironment.tryParse,
          'ApiKeyEnvironment',
        ),
        expiresAt: json['expiresAt'] == null
            ? null
            : DateTime.parse(json['expiresAt'] as String),
        pinnedApiVersion: json['pinnedApiVersion'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ApiKeyPrincipal: $error', json);
    }
  }

  final String apiKeyId;

  final String serviceAccountId;

  final String tenantId;

  final List<Permission> permissions;

  final ApiKeyEnvironment environment;

  final DateTime? expiresAt;

  final String? pinnedApiVersion;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'apiKeyId': apiKeyId,
    'serviceAccountId': serviceAccountId,
    'tenantId': tenantId,
    'permissions': [for (final e0 in permissions) e0.wireCode],
    'environment': environment.wireCode,
    'expiresAt': switch (expiresAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
    'pinnedApiVersion': pinnedApiVersion,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ApiKeyPrincipal value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApiKeyPrincipal &&
          contractEquals(apiKeyId, other.apiKeyId) &&
          contractEquals(serviceAccountId, other.serviceAccountId) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(permissions, other.permissions) &&
          contractEquals(environment, other.environment) &&
          contractEquals(expiresAt, other.expiresAt) &&
          contractEquals(pinnedApiVersion, other.pinnedApiVersion);

  @override
  int get hashCode => contractHash([
    apiKeyId,
    serviceAccountId,
    tenantId,
    permissions,
    environment,
    expiresAt,
    pinnedApiVersion,
  ]);
}

/// Public key of the JWKS set.
@immutable
final class Jwk {
  const Jwk({
    required this.kty,
    required this.crv,
    required this.kid,
    required this.use,
    required this.alg,
    required this.x,
    required this.y,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory Jwk.fromJson(Map<String, dynamic> json) {
    try {
      return Jwk(
        kty: json['kty'] as String,
        crv: json['crv'] as String,
        kid: json['kid'] as String,
        use: json['use'] as String,
        alg: json['alg'] as String,
        x: json['x'] as String,
        y: json['y'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid Jwk: $error', json);
    }
  }

  final String kty;

  final String crv;

  final String kid;

  final String use;

  final String alg;

  final String x;

  final String y;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'kty': kty,
    'crv': crv,
    'kid': kid,
    'use': use,
    'alg': alg,
    'x': x,
    'y': y,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(Jwk value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Jwk &&
          contractEquals(kty, other.kty) &&
          contractEquals(crv, other.crv) &&
          contractEquals(kid, other.kid) &&
          contractEquals(use, other.use) &&
          contractEquals(alg, other.alg) &&
          contractEquals(x, other.x) &&
          contractEquals(y, other.y);

  @override
  int get hashCode => contractHash([kty, crv, kid, use, alg, x, y]);
}

/// Active public keys to verify access tokens.
@immutable
final class Jwks {
  const Jwks({required this.keys});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory Jwks.fromJson(Map<String, dynamic> json) {
    try {
      return Jwks(
        keys: [
          for (final e0 in json['keys'] as List<dynamic>)
            Jwk.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid Jwks: $error', json);
    }
  }

  final List<Jwk> keys;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'keys': [for (final e0 in keys) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(Jwks value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Jwks && contractEquals(keys, other.keys);

  @override
  int get hashCode => contractHash([keys]);
}

/// A user was registered.
@immutable
final class UserRegisteredPayload {
  const UserRegisteredPayload({
    required this.userId,
    required this.homeTenantId,
    required this.registeredAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserRegisteredPayload.fromJson(Map<String, dynamic> json) {
    try {
      return UserRegisteredPayload(
        userId: json['userId'] as String,
        homeTenantId: json['homeTenantId'] as String,
        registeredAt: DateTime.parse(json['registeredAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserRegisteredPayload: $error', json);
    }
  }

  final String userId;

  final String homeTenantId;

  final DateTime registeredAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'homeTenantId': homeTenantId,
    'registeredAt': registeredAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserRegisteredPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserRegisteredPayload &&
          contractEquals(userId, other.userId) &&
          contractEquals(homeTenantId, other.homeTenantId) &&
          contractEquals(registeredAt, other.registeredAt);

  @override
  int get hashCode => contractHash([userId, homeTenantId, registeredAt]);
}

/// A user was suspended.
@immutable
final class UserSuspendedPayload {
  const UserSuspendedPayload({
    required this.userId,
    this.reason,
    required this.suspendedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserSuspendedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return UserSuspendedPayload(
        userId: json['userId'] as String,
        reason: json['reason'] as String?,
        suspendedAt: DateTime.parse(json['suspendedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserSuspendedPayload: $error', json);
    }
  }

  final String userId;

  final String? reason;

  final DateTime suspendedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'reason': ?reason,
    'suspendedAt': suspendedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserSuspendedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserSuspendedPayload &&
          contractEquals(userId, other.userId) &&
          contractEquals(reason, other.reason) &&
          contractEquals(suspendedAt, other.suspendedAt);

  @override
  int get hashCode => contractHash([userId, reason, suspendedAt]);
}

/// A user was reactivated.
@immutable
final class UserReactivatedPayload {
  const UserReactivatedPayload({
    required this.userId,
    required this.reactivatedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserReactivatedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return UserReactivatedPayload(
        userId: json['userId'] as String,
        reactivatedAt: DateTime.parse(json['reactivatedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserReactivatedPayload: $error', json);
    }
  }

  final String userId;

  final DateTime reactivatedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'reactivatedAt': reactivatedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserReactivatedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserReactivatedPayload &&
          contractEquals(userId, other.userId) &&
          contractEquals(reactivatedAt, other.reactivatedAt);

  @override
  int get hashCode => contractHash([userId, reactivatedAt]);
}

/// The email of a user changed.
@immutable
final class UserEmailChangedPayload {
  const UserEmailChangedPayload({
    required this.userId,
    required this.changedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserEmailChangedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return UserEmailChangedPayload(
        userId: json['userId'] as String,
        changedAt: DateTime.parse(json['changedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserEmailChangedPayload: $error', json);
    }
  }

  final String userId;

  final DateTime changedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'changedAt': changedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserEmailChangedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserEmailChangedPayload &&
          contractEquals(userId, other.userId) &&
          contractEquals(changedAt, other.changedAt);

  @override
  int get hashCode => contractHash([userId, changedAt]);
}

/// A verifier device was registered.
@immutable
final class DeviceRegisteredPayload {
  const DeviceRegisteredPayload({
    required this.userId,
    required this.deviceId,
    required this.platform,
    required this.verifier,
    required this.registeredAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DeviceRegisteredPayload.fromJson(Map<String, dynamic> json) {
    try {
      return DeviceRegisteredPayload(
        userId: json['userId'] as String,
        deviceId: json['deviceId'] as String,
        platform: json['platform'] as String,
        verifier: json['verifier'] as bool,
        registeredAt: DateTime.parse(json['registeredAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid DeviceRegisteredPayload: $error', json);
    }
  }

  final String userId;

  final String deviceId;

  final String platform;

  final bool verifier;

  final DateTime registeredAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'deviceId': deviceId,
    'platform': platform,
    'verifier': verifier,
    'registeredAt': registeredAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DeviceRegisteredPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceRegisteredPayload &&
          contractEquals(userId, other.userId) &&
          contractEquals(deviceId, other.deviceId) &&
          contractEquals(platform, other.platform) &&
          contractEquals(verifier, other.verifier) &&
          contractEquals(registeredAt, other.registeredAt);

  @override
  int get hashCode =>
      contractHash([userId, deviceId, platform, verifier, registeredAt]);
}

/// A device was removed from the account.
@immutable
final class DeviceRemovedPayload {
  const DeviceRemovedPayload({
    required this.userId,
    required this.deviceId,
    required this.removedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory DeviceRemovedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return DeviceRemovedPayload(
        userId: json['userId'] as String,
        deviceId: json['deviceId'] as String,
        removedAt: DateTime.parse(json['removedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid DeviceRemovedPayload: $error', json);
    }
  }

  final String userId;

  final String deviceId;

  final DateTime removedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'deviceId': deviceId,
    'removedAt': removedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(DeviceRemovedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceRemovedPayload &&
          contractEquals(userId, other.userId) &&
          contractEquals(deviceId, other.deviceId) &&
          contractEquals(removedAt, other.removedAt);

  @override
  int get hashCode => contractHash([userId, deviceId, removedAt]);
}

/// A tenant was created.
@immutable
final class TenantCreatedPayload {
  const TenantCreatedPayload({
    required this.tenantId,
    required this.slug,
    required this.kind,
    required this.region,
    this.ownerUserId,
    required this.createdAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantCreatedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return TenantCreatedPayload(
        tenantId: json['tenantId'] as String,
        slug: json['slug'] as String,
        kind: json['kind'] as String,
        region: json['region'] as String,
        ownerUserId: json['ownerUserId'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantCreatedPayload: $error', json);
    }
  }

  final String tenantId;

  final String slug;

  final String kind;

  final String region;

  final String? ownerUserId;

  final DateTime createdAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'slug': slug,
    'kind': kind,
    'region': region,
    'ownerUserId': ?ownerUserId,
    'createdAt': createdAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantCreatedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantCreatedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(slug, other.slug) &&
          contractEquals(kind, other.kind) &&
          contractEquals(region, other.region) &&
          contractEquals(ownerUserId, other.ownerUserId) &&
          contractEquals(createdAt, other.createdAt);

  @override
  int get hashCode =>
      contractHash([tenantId, slug, kind, region, ownerUserId, createdAt]);
}

/// A tenant was suspended.
@immutable
final class TenantSuspendedPayload {
  const TenantSuspendedPayload({
    required this.tenantId,
    required this.suspendedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantSuspendedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return TenantSuspendedPayload(
        tenantId: json['tenantId'] as String,
        suspendedAt: DateTime.parse(json['suspendedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantSuspendedPayload: $error', json);
    }
  }

  final String tenantId;

  final DateTime suspendedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'suspendedAt': suspendedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantSuspendedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantSuspendedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(suspendedAt, other.suspendedAt);

  @override
  int get hashCode => contractHash([tenantId, suspendedAt]);
}

/// A tenant was reactivated.
@immutable
final class TenantReactivatedPayload {
  const TenantReactivatedPayload({
    required this.tenantId,
    required this.reactivatedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantReactivatedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return TenantReactivatedPayload(
        tenantId: json['tenantId'] as String,
        reactivatedAt: DateTime.parse(json['reactivatedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantReactivatedPayload: $error', json);
    }
  }

  final String tenantId;

  final DateTime reactivatedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'reactivatedAt': reactivatedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantReactivatedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantReactivatedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(reactivatedAt, other.reactivatedAt);

  @override
  int get hashCode => contractHash([tenantId, reactivatedAt]);
}

/// The membership of a user in a tenant changed.
@immutable
final class MembershipChangedPayload {
  const MembershipChangedPayload({
    required this.tenantId,
    required this.userId,
    required this.kind,
    required this.groupIds,
    required this.changedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory MembershipChangedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return MembershipChangedPayload(
        tenantId: json['tenantId'] as String,
        userId: json['userId'] as String,
        kind: json['kind'] as String,
        groupIds: [
          for (final e0 in json['groupIds'] as List<dynamic>) e0 as String,
        ],
        changedAt: DateTime.parse(json['changedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid MembershipChangedPayload: $error', json);
    }
  }

  final String tenantId;

  final String userId;

  final String kind;

  final List<String> groupIds;

  final DateTime changedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'userId': userId,
    'kind': kind,
    'groupIds': groupIds,
    'changedAt': changedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(MembershipChangedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MembershipChangedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(userId, other.userId) &&
          contractEquals(kind, other.kind) &&
          contractEquals(groupIds, other.groupIds) &&
          contractEquals(changedAt, other.changedAt);

  @override
  int get hashCode =>
      contractHash([tenantId, userId, kind, groupIds, changedAt]);
}

/// The permissions of a user or a tenant changed.
@immutable
final class PermissionsChangedPayload {
  const PermissionsChangedPayload({
    required this.tenantId,
    this.userId,
    required this.permissionVersion,
    required this.changedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PermissionsChangedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return PermissionsChangedPayload(
        tenantId: json['tenantId'] as String,
        userId: json['userId'] as String?,
        permissionVersion: json['permissionVersion'] as String,
        changedAt: DateTime.parse(json['changedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PermissionsChangedPayload: $error', json);
    }
  }

  final String tenantId;

  final String? userId;

  final String permissionVersion;

  final DateTime changedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'userId': ?userId,
    'permissionVersion': permissionVersion,
    'changedAt': changedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PermissionsChangedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PermissionsChangedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(userId, other.userId) &&
          contractEquals(permissionVersion, other.permissionVersion) &&
          contractEquals(changedAt, other.changedAt);

  @override
  int get hashCode =>
      contractHash([tenantId, userId, permissionVersion, changedAt]);
}

/// An API key was created. It does not include the secret.
@immutable
final class ApiKeyCreatedPayload {
  const ApiKeyCreatedPayload({
    required this.apiKeyId,
    required this.serviceAccountId,
    required this.tenantId,
    required this.prefix,
    required this.environment,
    required this.createdBy,
    required this.createdAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ApiKeyCreatedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return ApiKeyCreatedPayload(
        apiKeyId: json['apiKeyId'] as String,
        serviceAccountId: json['serviceAccountId'] as String,
        tenantId: json['tenantId'] as String,
        prefix: json['prefix'] as String,
        environment: json['environment'] as String,
        createdBy: json['createdBy'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ApiKeyCreatedPayload: $error', json);
    }
  }

  final String apiKeyId;

  final String serviceAccountId;

  final String tenantId;

  final String prefix;

  final String environment;

  final String createdBy;

  final DateTime createdAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'apiKeyId': apiKeyId,
    'serviceAccountId': serviceAccountId,
    'tenantId': tenantId,
    'prefix': prefix,
    'environment': environment,
    'createdBy': createdBy,
    'createdAt': createdAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ApiKeyCreatedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApiKeyCreatedPayload &&
          contractEquals(apiKeyId, other.apiKeyId) &&
          contractEquals(serviceAccountId, other.serviceAccountId) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(prefix, other.prefix) &&
          contractEquals(environment, other.environment) &&
          contractEquals(createdBy, other.createdBy) &&
          contractEquals(createdAt, other.createdAt);

  @override
  int get hashCode => contractHash([
    apiKeyId,
    serviceAccountId,
    tenantId,
    prefix,
    environment,
    createdBy,
    createdAt,
  ]);
}

/// An API key was revoked.
@immutable
final class ApiKeyRevokedPayload {
  const ApiKeyRevokedPayload({
    required this.apiKeyId,
    required this.tenantId,
    required this.prefix,
    required this.revokedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ApiKeyRevokedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return ApiKeyRevokedPayload(
        apiKeyId: json['apiKeyId'] as String,
        tenantId: json['tenantId'] as String,
        prefix: json['prefix'] as String,
        revokedAt: DateTime.parse(json['revokedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ApiKeyRevokedPayload: $error', json);
    }
  }

  final String apiKeyId;

  final String tenantId;

  final String prefix;

  final DateTime revokedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'apiKeyId': apiKeyId,
    'tenantId': tenantId,
    'prefix': prefix,
    'revokedAt': revokedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ApiKeyRevokedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApiKeyRevokedPayload &&
          contractEquals(apiKeyId, other.apiKeyId) &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(prefix, other.prefix) &&
          contractEquals(revokedAt, other.revokedAt);

  @override
  int get hashCode => contractHash([apiKeyId, tenantId, prefix, revokedAt]);
}

/// A security alert was raised on an account.
@immutable
final class SecurityAlertRaisedPayload {
  const SecurityAlertRaisedPayload({
    required this.alertId,
    required this.userId,
    required this.type,
    required this.raisedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SecurityAlertRaisedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return SecurityAlertRaisedPayload(
        alertId: json['alertId'] as String,
        userId: json['userId'] as String,
        type: decodeEnum(
          json['type'],
          SecurityAlertType.tryParse,
          'SecurityAlertType',
        ),
        raisedAt: DateTime.parse(json['raisedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SecurityAlertRaisedPayload: $error', json);
    }
  }

  final String alertId;

  final String userId;

  final SecurityAlertType type;

  final DateTime raisedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'alertId': alertId,
    'userId': userId,
    'type': type.wireCode,
    'raisedAt': raisedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SecurityAlertRaisedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SecurityAlertRaisedPayload &&
          contractEquals(alertId, other.alertId) &&
          contractEquals(userId, other.userId) &&
          contractEquals(type, other.type) &&
          contractEquals(raisedAt, other.raisedAt);

  @override
  int get hashCode => contractHash([alertId, userId, type, raisedAt]);
}

/// Tenant being provisioned and the saga that activates it.
@immutable
final class TenantCreation {
  const TenantCreation({required this.tenantId, required this.sagaId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory TenantCreation.fromJson(Map<String, dynamic> json) {
    try {
      return TenantCreation(
        tenantId: json['tenantId'] as String,
        sagaId: json['sagaId'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TenantCreation: $error', json);
    }
  }

  final String tenantId;

  final String sagaId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'sagaId': sagaId,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(TenantCreation value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantCreation &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(sagaId, other.sagaId);

  @override
  int get hashCode => contractHash([tenantId, sagaId]);
}

/// Saga that deletes the user account.
@immutable
final class AccountDeletionStarted {
  const AccountDeletionStarted({required this.sagaId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory AccountDeletionStarted.fromJson(Map<String, dynamic> json) {
    try {
      return AccountDeletionStarted(sagaId: json['sagaId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid AccountDeletionStarted: $error', json);
    }
  }

  final String sagaId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'sagaId': sagaId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(AccountDeletionStarted value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AccountDeletionStarted && contractEquals(sagaId, other.sagaId);

  @override
  int get hashCode => contractHash([sagaId]);
}

/// Saga to query.
@immutable
final class GetSagaRequest {
  const GetSagaRequest({required this.sagaId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory GetSagaRequest.fromJson(Map<String, dynamic> json) {
    try {
      return GetSagaRequest(sagaId: json['sagaId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid GetSagaRequest: $error', json);
    }
  }

  final String sagaId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'sagaId': sagaId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(GetSagaRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetSagaRequest && contractEquals(sagaId, other.sagaId);

  @override
  int get hashCode => contractHash([sagaId]);
}

/// Status of an identity saga.
@immutable
final class SagaSummary {
  const SagaSummary({
    required this.sagaId,
    required this.saga,
    required this.status,
    required this.startedAt,
    required this.finishedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory SagaSummary.fromJson(Map<String, dynamic> json) {
    try {
      return SagaSummary(
        sagaId: json['sagaId'] as String,
        saga: decodeEnum(json['saga'], IdentitySaga.tryParse, 'IdentitySaga'),
        status: decodeEnum(
          json['status'],
          IdentitySagaStatus.tryParse,
          'IdentitySagaStatus',
        ),
        startedAt: DateTime.parse(json['startedAt'] as String),
        finishedAt: json['finishedAt'] == null
            ? null
            : DateTime.parse(json['finishedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid SagaSummary: $error', json);
    }
  }

  final String sagaId;

  final IdentitySaga saga;

  final IdentitySagaStatus status;

  final DateTime startedAt;

  final DateTime? finishedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'sagaId': sagaId,
    'saga': saga.wireCode,
    'status': status.wireCode,
    'startedAt': startedAt.toUtc().toIso8601String(),
    'finishedAt': switch (finishedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(SagaSummary value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SagaSummary &&
          contractEquals(sagaId, other.sagaId) &&
          contractEquals(saga, other.saga) &&
          contractEquals(status, other.status) &&
          contractEquals(startedAt, other.startedAt) &&
          contractEquals(finishedAt, other.finishedAt);

  @override
  int get hashCode =>
      contractHash([sagaId, saga, status, startedAt, finishedAt]);
}

/// User whose personal data is erased.
@immutable
final class EraseUserInput {
  const EraseUserInput({required this.userId});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EraseUserInput.fromJson(Map<String, dynamic> json) {
    try {
      return EraseUserInput(userId: json['userId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid EraseUserInput: $error', json);
    }
  }

  final String userId;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'userId': userId};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EraseUserInput value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EraseUserInput && contractEquals(userId, other.userId);

  @override
  int get hashCode => contractHash([userId]);
}

/// Result of erasing a user.
@immutable
final class EraseUserResult {
  const EraseUserResult({required this.userId, required this.erasedAt});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory EraseUserResult.fromJson(Map<String, dynamic> json) {
    try {
      return EraseUserResult(
        userId: json['userId'] as String,
        erasedAt: DateTime.parse(json['erasedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid EraseUserResult: $error', json);
    }
  }

  final String userId;

  final DateTime erasedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'erasedAt': erasedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(EraseUserResult value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EraseUserResult &&
          contractEquals(userId, other.userId) &&
          contractEquals(erasedAt, other.erasedAt);

  @override
  int get hashCode => contractHash([userId, erasedAt]);
}

/// User whose push devices are requested.
@immutable
final class ListPushTargetsInput {
  const ListPushTargetsInput({required this.user});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ListPushTargetsInput.fromJson(Map<String, dynamic> json) {
    try {
      return ListPushTargetsInput(
        user: UserRef.fromJson(json['user'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ListPushTargetsInput: $error', json);
    }
  }

  final UserRef user;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{'user': user.toJson()};

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ListPushTargetsInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ListPushTargetsInput && contractEquals(user, other.user);

  @override
  int get hashCode => contractHash([user]);
}

/// Device that can receive a push.
@immutable
final class PushTarget {
  const PushTarget({
    required this.deviceId,
    required this.platform,
    required this.pushToken,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PushTarget.fromJson(Map<String, dynamic> json) {
    try {
      return PushTarget(
        deviceId: json['deviceId'] as String,
        platform: json['platform'] as String,
        pushToken: json['pushToken'] as String,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PushTarget: $error', json);
    }
  }

  final String deviceId;

  final String platform;

  final String pushToken;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'deviceId': deviceId,
    'platform': platform,
    'pushToken': pushToken,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PushTarget value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PushTarget &&
          contractEquals(deviceId, other.deviceId) &&
          contractEquals(platform, other.platform) &&
          contractEquals(pushToken, other.pushToken);

  @override
  int get hashCode => contractHash([deviceId, platform, pushToken]);
}

/// Push devices of a user.
@immutable
final class PushTargets {
  const PushTargets({required this.targets});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory PushTargets.fromJson(Map<String, dynamic> json) {
    try {
      return PushTargets(
        targets: [
          for (final e0 in json['targets'] as List<dynamic>)
            PushTarget.fromJson(e0 as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid PushTargets: $error', json);
    }
  }

  final List<PushTarget> targets;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'targets': [for (final e0 in targets) e0.toJson()],
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(PushTargets value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PushTargets && contractEquals(targets, other.targets);

  @override
  int get hashCode => contractHash([targets]);
}

/// Members of a tenant that have a permission.
@immutable
final class ListMembersByPermissionInput {
  const ListMembersByPermissionInput({
    required this.tenantId,
    required this.permission,
    this.limit,
    this.after,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory ListMembersByPermissionInput.fromJson(Map<String, dynamic> json) {
    try {
      return ListMembersByPermissionInput(
        tenantId: json['tenantId'] as String,
        permission: json['permission'] as String,
        limit: json['limit'] == null ? null : (json['limit'] as num).toInt(),
        after: json['after'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException(
        'Invalid ListMembersByPermissionInput: $error',
        json,
      );
    }
  }

  final String tenantId;

  final String permission;

  final int? limit;

  final String? after;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'permission': permission,
    'limit': ?limit,
    'after': ?after,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(ListMembersByPermissionInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ListMembersByPermissionInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(permission, other.permission) &&
          contractEquals(limit, other.limit) &&
          contractEquals(after, other.after);

  @override
  int get hashCode => contractHash([tenantId, permission, limit, after]);
}

/// Page of users.
@immutable
final class UserRefPage {
  const UserRefPage({required this.items, required this.nextCursor});

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserRefPage.fromJson(Map<String, dynamic> json) {
    try {
      return UserRefPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            UserRef.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserRefPage: $error', json);
    }
  }

  final List<UserRef> items;

  final String? nextCursor;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserRefPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserRefPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// A user was erased.
@immutable
final class UserErasedPayload {
  const UserErasedPayload({
    required this.userId,
    required this.homeTenantId,
    required this.erasedAt,
  });

  /// Reads the object from JSON. Throws [FormatException] if it does not match the type.
  factory UserErasedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return UserErasedPayload(
        userId: json['userId'] as String,
        homeTenantId: json['homeTenantId'] as String,
        erasedAt: DateTime.parse(json['erasedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UserErasedPayload: $error', json);
    }
  }

  final String userId;

  final String homeTenantId;

  final DateTime erasedAt;

  /// JSON of the object; omits null optional fields.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'homeTenantId': homeTenantId,
    'erasedAt': erasedAt.toUtc().toIso8601String(),
  };

  /// Same as [toJson], for use as a constant tear-off.
  static Map<String, dynamic> encode(UserErasedPayload value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserErasedPayload &&
          contractEquals(userId, other.userId) &&
          contractEquals(homeTenantId, other.homeTenantId) &&
          contractEquals(erasedAt, other.erasedAt);

  @override
  int get hashCode => contractHash([userId, homeTenantId, erasedAt]);
}
