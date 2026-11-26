// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import '../../core/core.dart';
import '../../identity/schemas/identity_schemas.dart';
import '../../identity/types/identity_types.dart';
import '../../platform/enums/platform_enums.dart';

/// Events published by the `identity` contract.
abstract final class IdentityEvents {
  /// A session was revoked. The realtime gateway closes its connections.
  ///
  /// `identity.session.revoked.v1`
  static const sessionRevoked = MessageDescriptor<SessionRevokedPayload>(
    type: 'identity.session.revoked.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: SessionRevokedPayloadSchema.validateIncoming,
    decodePayload: SessionRevokedPayload.fromJson,
  );

  /// The tokens of a session, a user or a tenant were revoked. Each service updates its cache.
  ///
  /// `identity.tokens.revoked.v1`
  static const tokensRevoked = MessageDescriptor<TokensRevokedPayload>(
    type: 'identity.tokens.revoked.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TokensRevokedPayloadSchema.validateIncoming,
    decodePayload: TokensRevokedPayload.fromJson,
  );

  /// A new user was registered.
  ///
  /// `identity.user.registered.v1`
  static const userRegistered = MessageDescriptor<UserRegisteredPayload>(
    type: 'identity.user.registered.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserRegisteredPayloadSchema.validateIncoming,
    decodePayload: UserRegisteredPayload.fromJson,
  );

  /// A user was suspended and their sessions were revoked.
  ///
  /// `identity.user.suspended.v1`
  static const userSuspended = MessageDescriptor<UserSuspendedPayload>(
    type: 'identity.user.suspended.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserSuspendedPayloadSchema.validateIncoming,
    decodePayload: UserSuspendedPayload.fromJson,
  );

  /// A suspended user was reactivated.
  ///
  /// `identity.user.reactivated.v1`
  static const userReactivated = MessageDescriptor<UserReactivatedPayload>(
    type: 'identity.user.reactivated.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserReactivatedPayloadSchema.validateIncoming,
    decodePayload: UserReactivatedPayload.fromJson,
  );

  /// The email of a user changed. It does not include addresses.
  ///
  /// `identity.user.email-changed.v1`
  static const userEmailChanged = MessageDescriptor<UserEmailChangedPayload>(
    type: 'identity.user.email-changed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserEmailChangedPayloadSchema.validateIncoming,
    decodePayload: UserEmailChangedPayload.fromJson,
  );

  /// A device that can approve sensitive actions was registered.
  ///
  /// `identity.device.registered.v1`
  static const deviceRegistered = MessageDescriptor<DeviceRegisteredPayload>(
    type: 'identity.device.registered.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: DeviceRegisteredPayloadSchema.validateIncoming,
    decodePayload: DeviceRegisteredPayload.fromJson,
  );

  /// A device was removed from the account.
  ///
  /// `identity.device.removed.v1`
  static const deviceRemoved = MessageDescriptor<DeviceRemovedPayload>(
    type: 'identity.device.removed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: DeviceRemovedPayloadSchema.validateIncoming,
    decodePayload: DeviceRemovedPayload.fromJson,
  );

  /// A tenant was created.
  ///
  /// `identity.tenant.created.v1`
  static const tenantCreated = MessageDescriptor<TenantCreatedPayload>(
    type: 'identity.tenant.created.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TenantCreatedPayloadSchema.validateIncoming,
    decodePayload: TenantCreatedPayload.fromJson,
  );

  /// A tenant was suspended and its tokens were revoked.
  ///
  /// `identity.tenant.suspended.v1`
  static const tenantSuspended = MessageDescriptor<TenantSuspendedPayload>(
    type: 'identity.tenant.suspended.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TenantSuspendedPayloadSchema.validateIncoming,
    decodePayload: TenantSuspendedPayload.fromJson,
  );

  /// A suspended tenant was reactivated.
  ///
  /// `identity.tenant.reactivated.v1`
  static const tenantReactivated = MessageDescriptor<TenantReactivatedPayload>(
    type: 'identity.tenant.reactivated.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: TenantReactivatedPayloadSchema.validateIncoming,
    decodePayload: TenantReactivatedPayload.fromJson,
  );

  /// The membership of a user in a tenant changed.
  ///
  /// `identity.membership.changed.v1`
  static const membershipChanged = MessageDescriptor<MembershipChangedPayload>(
    type: 'identity.membership.changed.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: MembershipChangedPayloadSchema.validateIncoming,
    decodePayload: MembershipChangedPayload.fromJson,
  );

  /// The permissions of a user or a tenant changed. Without userId it affects the whole tenant.
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

  /// An API key was created. It does not include the secret.
  ///
  /// `identity.api-key.created.v1`
  static const apiKeyCreated = MessageDescriptor<ApiKeyCreatedPayload>(
    type: 'identity.api-key.created.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: ApiKeyCreatedPayloadSchema.validateIncoming,
    decodePayload: ApiKeyCreatedPayload.fromJson,
  );

  /// An API key was revoked.
  ///
  /// `identity.api-key.revoked.v1`
  static const apiKeyRevoked = MessageDescriptor<ApiKeyRevokedPayload>(
    type: 'identity.api-key.revoked.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: ApiKeyRevokedPayloadSchema.validateIncoming,
    decodePayload: ApiKeyRevokedPayload.fromJson,
  );

  /// A security alert was raised on an account. Notifies the user through their channel.
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

  /// The personal data of a user was erased. Services that keep a trace of the user delete or anonymize it.
  ///
  /// `identity.user.erased.v1`
  static const userErased = MessageDescriptor<UserErasedPayload>(
    type: 'identity.user.erased.v1',
    kind: MessageKind.event,
    version: 1,
    validatePayload: UserErasedPayloadSchema.validateIncoming,
    decodePayload: UserErasedPayload.fromJson,
  );

  /// All descriptors, in contract order.
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
    userErased,
  ];

  /// Descriptor with [type], or null if this client does not know it.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}

/// Commands handled by the `identity` contract.
abstract final class IdentityCommands {
  /// Looks up the account of the email and, if it can reset its password, sends it the reset email.
  ///
  /// `identity.password-reset.send.v1`
  static const sendPasswordReset = MessageDescriptor<PasswordResetRequest>(
    type: 'identity.password-reset.send.v1',
    kind: MessageKind.command,
    version: 1,
    validatePayload: PasswordResetRequestSchema.validateIncoming,
    decodePayload: PasswordResetRequest.fromJson,
  );

  /// All descriptors, in contract order.
  static const all = <MessageDescriptor<Object?>>[sendPasswordReset];

  /// Descriptor with [type], or null if this client does not know it.
  static MessageDescriptor<Object?>? byType(String type) {
    for (final message in all) {
      if (message.type == type) return message;
    }
    return null;
  }
}
