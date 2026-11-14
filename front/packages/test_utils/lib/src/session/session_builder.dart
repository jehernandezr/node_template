import 'package:shell_core/shell_core.dart';

/// Builds a [UserSession] step by step. Replaces the literal `UserSession(`
/// scattered through the tests.
final class SessionBuilder {
  /// A signed-in session of [userId] in [tenantId], with no access data.
  /// A null [tenantId] is a platform operator, who belongs to no tenant.
  SessionBuilder({String userId = 'user-1', String? tenantId = 'tenant-1'})
    : this._(userId, tenantId);

  /// A session with no signed-in user.
  SessionBuilder.anonymous() : this._(null, null);

  SessionBuilder._(this._userId, this._tenantId);

  final String? _userId;
  final String? _tenantId;
  final Set<Permission> _permissions = {};
  final Set<PlatformRole> _roles = {};
  final Set<PlanFeature> _features = {};
  final Set<FeatureFlag> _flags = {};
  DateTime? _mfaVerifiedAt;

  /// Adds [permissions]. Returns this builder.
  SessionBuilder withPermissions(Iterable<Permission> permissions) {
    _permissions.addAll(permissions);
    return this;
  }

  /// Adds [roles]. Returns this builder.
  SessionBuilder withRoles(Iterable<PlatformRole> roles) {
    _roles.addAll(roles);
    return this;
  }

  /// Adds [features]. Returns this builder.
  SessionBuilder withFeatures(Iterable<PlanFeature> features) {
    _features.addAll(features);
    return this;
  }

  /// Adds [flags]. Returns this builder.
  SessionBuilder withFlags(Iterable<FeatureFlag> flags) {
    _flags.addAll(flags);
    return this;
  }

  /// Sets the last second factor time to [at]. Returns this builder.
  SessionBuilder mfaVerifiedAt(DateTime at) {
    _mfaVerifiedAt = at;
    return this;
  }

  /// The session built so far.
  UserSession build() => UserSession(
    userId: _userId,
    tenantId: _tenantId,
    permissions: _permissions,
    platformRoles: _roles,
    features: _features,
    flags: _flags,
    mfaVerifiedAt: _mfaVerifiedAt,
  );
}
