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

  /// Se registró un usuario nuevo.
  ///
  /// `identity.user.registered.v1`
  static const userRegistered = MessageDescriptor<UserRegisteredPayload>(
    type: 'identity.user.registered.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserRegisteredPayloadSchema.validateIncoming,
    decodePayload: UserRegisteredPayload.fromJson,
  );

  /// Se suspendió un usuario y se revocaron sus sesiones.
  ///
  /// `identity.user.suspended.v1`
  static const userSuspended = MessageDescriptor<UserSuspendedPayload>(
    type: 'identity.user.suspended.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserSuspendedPayloadSchema.validateIncoming,
    decodePayload: UserSuspendedPayload.fromJson,
  );

  /// Se reactivó un usuario suspendido.
  ///
  /// `identity.user.reactivated.v1`
  static const userReactivated = MessageDescriptor<UserReactivatedPayload>(
    type: 'identity.user.reactivated.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserReactivatedPayloadSchema.validateIncoming,
    decodePayload: UserReactivatedPayload.fromJson,
  );

  /// Cambió el email de un usuario. No incluye direcciones.
  ///
  /// `identity.user.email-changed.v1`
  static const userEmailChanged = MessageDescriptor<UserEmailChangedPayload>(
    type: 'identity.user.email-changed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserEmailChangedPayloadSchema.validateIncoming,
    decodePayload: UserEmailChangedPayload.fromJson,
  );

  /// Se registró un dispositivo que puede aprobar acciones sensibles.
  ///
  /// `identity.device.registered.v1`
  static const deviceRegistered = MessageDescriptor<DeviceRegisteredPayload>(
    type: 'identity.device.registered.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: DeviceRegisteredPayloadSchema.validateIncoming,
    decodePayload: DeviceRegisteredPayload.fromJson,
  );

  /// Se quitó un dispositivo de la cuenta.
  ///
  /// `identity.device.removed.v1`
  static const deviceRemoved = MessageDescriptor<DeviceRemovedPayload>(
    type: 'identity.device.removed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: DeviceRemovedPayloadSchema.validateIncoming,
    decodePayload: DeviceRemovedPayload.fromJson,
  );

  /// Se creó un tenant.
  ///
  /// `identity.tenant.created.v1`
  static const tenantCreated = MessageDescriptor<TenantCreatedPayload>(
    type: 'identity.tenant.created.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TenantCreatedPayloadSchema.validateIncoming,
    decodePayload: TenantCreatedPayload.fromJson,
  );

  /// Se suspendió un tenant y se revocaron sus tokens.
  ///
  /// `identity.tenant.suspended.v1`
  static const tenantSuspended = MessageDescriptor<TenantSuspendedPayload>(
    type: 'identity.tenant.suspended.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TenantSuspendedPayloadSchema.validateIncoming,
    decodePayload: TenantSuspendedPayload.fromJson,
  );

  /// Se reactivó un tenant suspendido.
  ///
  /// `identity.tenant.reactivated.v1`
  static const tenantReactivated = MessageDescriptor<TenantReactivatedPayload>(
    type: 'identity.tenant.reactivated.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TenantReactivatedPayloadSchema.validateIncoming,
    decodePayload: TenantReactivatedPayload.fromJson,
  );

  /// Cambió la membresía de un usuario en un tenant.
  ///
  /// `identity.membership.changed.v1`
  static const membershipChanged = MessageDescriptor<MembershipChangedPayload>(
    type: 'identity.membership.changed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: MembershipChangedPayloadSchema.validateIncoming,
    decodePayload: MembershipChangedPayload.fromJson,
  );

  /// Cambiaron los permisos de un usuario o de un tenant. Sin userId afecta a todo el tenant.
  ///
  /// `identity.permissions.changed.v1`
  static const permissionsChanged =
      MessageDescriptor<PermissionsChangedPayload>(
        type: 'identity.permissions.changed.v1',
        kind: MessageKind.event,
        version: 1,
        validatePayload: PermissionsChangedPayloadSchema.validateIncoming,
        decodePayload: PermissionsChangedPayload.fromJson,
      );

  /// Se creó una API key. No incluye el secreto.
  ///
  /// `identity.api-key.created.v1`
  static const apiKeyCreated = MessageDescriptor<ApiKeyCreatedPayload>(
    type: 'identity.api-key.created.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: ApiKeyCreatedPayloadSchema.validateIncoming,
    decodePayload: ApiKeyCreatedPayload.fromJson,
  );

  /// Se revocó una API key.
  ///
  /// `identity.api-key.revoked.v1`
  static const apiKeyRevoked = MessageDescriptor<ApiKeyRevokedPayload>(
    type: 'identity.api-key.revoked.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: ApiKeyRevokedPayloadSchema.validateIncoming,
    decodePayload: ApiKeyRevokedPayload.fromJson,
  );

  /// Se levantó una alerta de seguridad sobre una cuenta. Notifica al usuario por su canal.
  ///
  /// `identity.security-alert.raised.v1`
  static const securityAlertRaised =
      MessageDescriptor<SecurityAlertRaisedPayload>(
        type: 'identity.security-alert.raised.v1',
        kind: MessageKind.event,
        version: 1,
        validatePayload: SecurityAlertRaisedPayloadSchema.validateIncoming,
        decodePayload: SecurityAlertRaisedPayload.fromJson,
      );

  /// Todos los descriptores, en el orden del contrato.
  static const all = <MessageDescriptor<Object?>>[
    sessionRevoked,
    tokensRevoked,
    userRegistered,
    userSuspended,
    userReactivated,
    userEmailChanged,
    deviceRegistered,
    deviceRemoved,
    tenantCreated,
    tenantSuspended,
    tenantReactivated,
    membershipChanged,
    permissionsChanged,
    apiKeyCreated,
    apiKeyRevoked,
    securityAlertRaised,
  ];

  /// Descriptor con [type], o null si este cliente no lo conoce.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
