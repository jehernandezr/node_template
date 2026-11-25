import { Ids, DeviceProof, Now } from './fixtures.js';

/** Test WebAuthn credential: `{"id":"abc"}` in base64url. */
const CREDENTIAL_JSON = Buffer.from('{"id":"abc"}').toString('base64url');

/**
 * One valid example per request schema. Each test starts from here and
 * changes a field to check that the schema rejects it.
 */
export const ValidRequests = {
  SignUpRequest: {
    email: 'ana@example.com',
    password: 'a-long-password-2026',
    displayName: 'Ana',
    locale: 'es-CO',
  },
  EmailVerificationRequest: { email: 'ana@example.com' },
  EmailVerificationConfirmRequest: { token: 'verification-token' },
  UpdateProfileRequest: { displayName: 'Ana Pérez', locale: 'es' },
  EmailChangeRequest: { newEmail: 'new@example.com' },
  EmailChangeConfirmRequest: { token: 'change-token' },
  ChangePasswordRequest: {
    currentPassword: 'current-password',
    newPassword: 'new-secure-password',
  },
  PasswordResetRequest: { email: 'ana@example.com' },
  PasswordResetConfirmRequest: {
    token: 'token-reset',
    newPassword: 'new-secure-password',
  },
  RemoveDeviceRequest: { deviceId: Ids.device },
  UntrustDeviceRequest: { deviceId: Ids.device },
  PushTokenRequest: { pushToken: 'fcm-token-123' },
  PullDeviceApprovalsRequest: { ...DeviceProof },
  DenyDeviceApprovalRequest: { challengeId: Ids.challenge, ...DeviceProof },
  TotpConfirmRequest: { code: '123456' },
  MfaRecoveryStartRequest: { mfaToken: 'mfa-token' },
  MfaRecoveryConfirmRequest: { mfaToken: 'mfa-token', token: 'token-recovery' },
  PasskeySignInVerifyRequest: {
    challengeId: Ids.challenge,
    credentialJson: CREDENTIAL_JSON,
  },
  PasskeyMfaOptionsRequest: { mfaToken: 'mfa-token' },
  PasskeyMfaVerifyRequest: {
    mfaToken: 'mfa-token',
    challengeId: Ids.challenge,
    credentialJson: CREDENTIAL_JSON,
  },
  PasskeyStepUpOptionsRequest: { mfaToken: 'mfa-token' },
  PasskeyStepUpVerifyRequest: {
    mfaToken: 'mfa-token',
    challengeId: Ids.challenge,
    credentialJson: CREDENTIAL_JSON,
  },
  RegisterPasskeyRequest: {
    challengeId: Ids.challenge,
    credentialJson: CREDENTIAL_JSON,
    name: 'Laptop key',
  },
  RemovePasskeyRequest: { passkeyId: Ids.passkey },
  CreateTenantRequest: { slug: 'acme-co', name: 'Acme' },
  UpdateTenantRequest: { name: 'Acme SAS' },
  SwitchTenantRequest: { tenantId: Ids.tenant },
  RemoveMemberRequest: { userId: Ids.user },
  SetMemberGroupsRequest: { userId: Ids.user, groupIds: [Ids.group] },
  CreateGroupRequest: { name: 'Finance' },
  UpdateGroupRequest: { groupId: Ids.group, name: 'Finance and purchasing' },
  DeleteGroupRequest: { groupId: Ids.group },
  SetGroupRolesRequest: { groupId: Ids.group, roleIds: [Ids.role] },
  CreateRoleRequest: {
    name: 'Auditor',
    permissions: ['identity:members:read'],
  },
  UpdateRoleRequest: { roleId: Ids.role, name: 'Auditor senior' },
  DeleteRoleRequest: { roleId: Ids.role },
  InviteUserRequest: { email: 'invited@example.com', groupIds: [Ids.group] },
  RevokeInvitationRequest: { invitationId: Ids.invitation },
  AcceptInvitationRequest: { token: 'invitation-token' },
  CreateServiceAccountRequest: {
    name: 'ERP integration',
    permissions: ['identity:api-keys:manage'],
  },
  UpdateServiceAccountRequest: {
    serviceAccountId: Ids.serviceAccount,
    name: 'ERP',
  },
  DeleteServiceAccountRequest: { serviceAccountId: Ids.serviceAccount },
  ListApiKeysRequest: { serviceAccountId: Ids.serviceAccount, limit: 10 },
  CreateApiKeyRequest: {
    serviceAccountId: Ids.serviceAccount,
    environment: 'live',
    allowedCidrs: ['10.0.0.0/8'],
  },
  RotateApiKeyRequest: { apiKeyId: Ids.apiKey },
  RevokeApiKeyRequest: { apiKeyId: Ids.apiKey },
  AuthenticateApiKeyInput: { apiKey: 'sk_live_example', clientIp: '10.1.2.3' },
  SuspendUserInput: { userId: Ids.user, reason: 'Actividad sospechosa' },
  ReactivateUserInput: { userId: Ids.user },
  GetUserProfileInput: { userId: Ids.user },
  CreateTenantInput: {
    tenantId: Ids.tenant,
    slug: 'acme-co',
    name: 'Acme',
    region: 'sa-east-1',
    kind: 'organization',
    ownerUserId: Ids.owner,
  },
  TenantRefInput: { tenantId: Ids.tenant },
  SuspendTenantInput: { tenantId: Ids.tenant, reason: 'Payment overdue' },
} as const;

/** One valid example per event payload, with the same ids as the requests. */
export const ValidPayloads = {
  UserRegisteredPayload: {
    userId: Ids.user,
    homeTenantId: Ids.tenant,
    registeredAt: Now,
  },
  UserSuspendedPayload: {
    userId: Ids.user,
    reason: 'Actividad sospechosa',
    suspendedAt: Now,
  },
  UserReactivatedPayload: { userId: Ids.user, reactivatedAt: Now },
  UserEmailChangedPayload: { userId: Ids.user, changedAt: Now },
  DeviceRegisteredPayload: {
    userId: Ids.user,
    deviceId: Ids.device,
    platform: 'ios',
    verifier: true,
    registeredAt: Now,
  },
  DeviceRemovedPayload: {
    userId: Ids.user,
    deviceId: Ids.device,
    removedAt: Now,
  },
  TenantCreatedPayload: {
    tenantId: Ids.tenant,
    slug: 'acme-co',
    kind: 'organization',
    region: 'sa-east-1',
    ownerUserId: Ids.owner,
    createdAt: Now,
  },
  TenantSuspendedPayload: { tenantId: Ids.tenant, suspendedAt: Now },
  TenantReactivatedPayload: { tenantId: Ids.tenant, reactivatedAt: Now },
  MembershipChangedPayload: {
    tenantId: Ids.tenant,
    userId: Ids.user,
    kind: 'added',
    groupIds: [Ids.group],
    changedAt: Now,
  },
  PermissionsChangedPayload: {
    tenantId: Ids.tenant,
    permissionVersion: '3.1',
    changedAt: Now,
  },
  ApiKeyCreatedPayload: {
    apiKeyId: Ids.apiKey,
    serviceAccountId: Ids.serviceAccount,
    tenantId: Ids.tenant,
    prefix: 'ABCDEFGHJKLM',
    environment: 'live',
    createdBy: Ids.owner,
    createdAt: Now,
  },
  ApiKeyRevokedPayload: {
    apiKeyId: Ids.apiKey,
    tenantId: Ids.tenant,
    prefix: 'ABCDEFGHJKLM',
    revokedAt: Now,
  },
  SecurityAlertRaisedPayload: {
    alertId: Ids.alert,
    userId: Ids.user,
    type: 'new_device_sign_in',
    raisedAt: Now,
  },
} as const;
