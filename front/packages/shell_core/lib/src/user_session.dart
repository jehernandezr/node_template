import 'package:contracts/contracts.dart';

/// Immutable snapshot of the signed-in user's access data, with value equality.
///
/// [UserSession.anonymous] represents a visitor with no sign-in.
final class UserSession {
  /// Creates a session. Sets are copied and made unmodifiable.
  UserSession({
    this.userId,
    this.tenantId,
    Set<Permission> permissions = const {},
    Set<PlatformRole> platformRoles = const {},
    Set<PlanFeature> planFeatures = const {},
    Set<FeatureFlag> featureFlags = const {},
    this.mfaVerifiedAt,
  }) : permissions = Set.unmodifiable(permissions),
       platformRoles = Set.unmodifiable(platformRoles),
       planFeatures = Set.unmodifiable(planFeatures),
       featureFlags = Set.unmodifiable(featureFlags);

  /// A session without a signed-in user.
  factory UserSession.anonymous() => UserSession();

  /// Session of a real sign-in, from `GET /v1/me/access`.
  ///
  /// Copies the user, the tenant, the permissions, the platform roles, the
  /// plan features, the feature flags and the last second factor. Values
  /// this client does not know were already dropped when decoding.
  factory UserSession.fromAccess(SessionAccess access) => UserSession(
    userId: access.userId,
    tenantId: access.tenantId,
    permissions: access.permissions.toSet(),
    platformRoles: access.platformRoles.toSet(),
    planFeatures: access.features.toSet(),
    featureFlags: access.flags.toSet(),
    mfaVerifiedAt: access.mfaVerifiedAt,
  );

  /// Id of the signed-in user, or null when anonymous.
  final String? userId;

  /// Tenant the user is acting in, or null when anonymous.
  final String? tenantId;

  /// Permissions granted in the current tenant.
  final Set<Permission> permissions;

  /// Platform-level roles of the user.
  final Set<PlatformRole> platformRoles;

  /// Features included in the tenant plan.
  final Set<PlanFeature> planFeatures;

  /// Feature flags enabled for the user.
  final Set<FeatureFlag> featureFlags;

  /// Last time the user completed a second factor, or null when never in this
  /// session. `AccessRule.mfa` compares it with its maximum age.
  final DateTime? mfaVerifiedAt;

  /// Whether a user is signed in.
  bool get isAuthenticated => userId != null;

  /// Copy of this session whose second factor was verified [at].
  ///
  /// The step-up page calls this after a successful MFA challenge. Identity,
  /// permissions, roles, plan and flags are kept.
  UserSession withMfaVerifiedAt(DateTime at) => UserSession(
    userId: userId,
    tenantId: tenantId,
    permissions: permissions,
    platformRoles: platformRoles,
    planFeatures: planFeatures,
    featureFlags: featureFlags,
    mfaVerifiedAt: at,
  );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is UserSession &&
          other.userId == userId &&
          other.tenantId == tenantId &&
          other.mfaVerifiedAt == mfaVerifiedAt &&
          _sameSet(other.permissions, permissions) &&
          _sameSet(other.platformRoles, platformRoles) &&
          _sameSet(other.planFeatures, planFeatures) &&
          _sameSet(other.featureFlags, featureFlags));

  @override
  int get hashCode => Object.hash(
    userId,
    tenantId,
    Object.hashAllUnordered(permissions),
    Object.hashAllUnordered(platformRoles),
    Object.hashAllUnordered(planFeatures),
    Object.hashAllUnordered(featureFlags),
    mfaVerifiedAt,
  );

  static bool _sameSet<T>(Set<T> a, Set<T> b) =>
      a.length == b.length && a.containsAll(b);
}
