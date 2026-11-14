// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../identity/schemas/identity_schemas.dart';
import '../../identity/types/identity_types.dart';
import '../../platform/enums/platform_enums.dart';

/// Eventos que publica el contrato `identity`.
abstract final class IdentityEvents {
  /// Se revocó una sesión. El gateway de tiempo real cierra sus conexiones.
  ///
  /// `identity.session.revoked.v1`
  static const sessionRevoked = MessageDescriptor<SessionRevokedPayload>(
    type: 'identity.session.revoked.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: SessionRevokedPayloadSchema.validateIncoming,
    decodePayload: SessionRevokedPayload.fromJson,
  );

  /// Se revocaron los tokens de una sesión, un usuario o un tenant. Cada servicio actualiza su caché.
  ///
  /// `identity.tokens.revoked.v1`
  static const tokensRevoked = MessageDescriptor<TokensRevokedPayload>(
    type: 'identity.tokens.revoked.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TokensRevokedPayloadSchema.validateIncoming,
    decodePayload: TokensRevokedPayload.fromJson,
  );

  /// Todos los descriptores, en el orden del contrato.
  static const all = <MessageDescriptor<Object?>>[
    sessionRevoked,
    tokensRevoked,
  ];

  /// Descriptor con [type], o null si este cliente no lo conoce.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
