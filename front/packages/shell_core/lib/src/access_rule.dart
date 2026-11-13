import 'package:contracts/contracts.dart';

import 'user_session.dart';

/// Outcome of checking an [AccessRule] against a session.
enum AccessDecision {
  /// The session satisfies the rule.
  allowed,

  /// The session is anonymous and the rule needs a signed-in user.
  signInRequired,

  /// The session would pass if its second factor were recent: send the user
  /// to the step-up page.
  stepUpRequired,

  /// The session cannot satisfy the rule.
  denied,
}

/// Condition that decides whether a [UserSession] may use a microfrontend.
///
/// Build rules with the named factories and combine them with [AccessRule.all]
/// or [AccessRule.any].
sealed class AccessRule {
  const AccessRule();

  /// Allows everyone, including anonymous visitors.
  factory AccessRule.public() = _PublicRule;

  /// Allows any signed-in user.
  factory AccessRule.authenticated() = _AuthenticatedRule;

  /// Allows sessions that hold every permission in [permissions].
  factory AccessRule.permissions(List<Permission> permissions) =
      _PermissionsRule;

  /// Allows sessions that hold at least one permission in [permissions].
  factory AccessRule.anyPermission(List<Permission> permissions) =
      _AnyPermissionRule;

  /// Allows sessions that hold at least one role in [roles].
  factory AccessRule.platformRoles(List<PlatformRole> roles) =
      _PlatformRolesRule;

  /// Allows sessions whose plan includes [feature].
  factory AccessRule.planFeature(PlanFeature feature) = _PlanFeatureRule;

  /// Allows signed-in sessions whose second factor was verified at most
  /// [maxAge] ago (see [UserSession.mfaVerifiedAt]).
  ///
  /// A signed-in session that fails only because of this rule gets
  /// [AccessDecision.stepUpRequired], so the shell can send it to `/step-up`.
  /// Combine it with the other rules: `AccessRule.all([roles, mfa])`.
  factory AccessRule.mfa(Duration maxAge) = _MfaRule;

  /// Allows sessions that satisfy every rule in [rules].
  factory AccessRule.all(List<AccessRule> rules) = _AllRule;

  /// Allows sessions that satisfy at least one rule in [rules].
  factory AccessRule.any(List<AccessRule> rules) = _AnyRule;

  /// Whether [session] satisfies this rule at [now] (default: the current time).
  ///
  /// [now] only matters for [AccessRule.mfa].
  bool allows(UserSession session, {DateTime? now}) =>
      _check(session, now ?? DateTime.now(), assumeRecentMfa: false);

  /// Decides what [session] needs to pass this rule at [now] (default: the
  /// current time).
  AccessDecision decide(UserSession session, {DateTime? now}) {
    final at = now ?? DateTime.now();
    if (_check(session, at, assumeRecentMfa: false)) {
      return AccessDecision.allowed;
    }
    if (!session.isAuthenticated) return AccessDecision.signInRequired;
    if (_check(session, at, assumeRecentMfa: true)) {
      return AccessDecision.stepUpRequired;
    }
    return AccessDecision.denied;
  }

  /// Whether [session] passes, or would pass after a step-up, at [now].
  ///
  /// Menus use it: an entry that needs a recent second factor stays visible so
  /// the user can reach the step-up page from it.
  bool reachableBy(UserSession session, {DateTime? now}) =>
      _check(session, now ?? DateTime.now(), assumeRecentMfa: true);

  /// Evaluates the rule. With [assumeRecentMfa], MFA rules pass for any
  /// signed-in session. Implemented by the rules of this library.
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  });
}

final class _PublicRule extends AccessRule {
  _PublicRule();

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) => true;
}

final class _AuthenticatedRule extends AccessRule {
  _AuthenticatedRule();

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) => session.isAuthenticated;
}

final class _PermissionsRule extends AccessRule {
  _PermissionsRule(List<Permission> permissions)
    : assert(
        permissions.isNotEmpty,
        'permissions needs at least one permission',
      ),
      permissions = List.unmodifiable(permissions);

  final List<Permission> permissions;

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) => permissions.every(session.permissions.contains);
}

final class _AnyPermissionRule extends AccessRule {
  _AnyPermissionRule(List<Permission> permissions)
    : assert(
        permissions.isNotEmpty,
        'anyPermission needs at least one permission',
      ),
      permissions = List.unmodifiable(permissions);

  final List<Permission> permissions;

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) => permissions.any(session.permissions.contains);
}

final class _PlatformRolesRule extends AccessRule {
  _PlatformRolesRule(List<PlatformRole> roles)
    : assert(roles.isNotEmpty, 'platformRoles needs at least one role'),
      roles = List.unmodifiable(roles);

  final List<PlatformRole> roles;

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) => roles.any(session.platformRoles.contains);
}

final class _PlanFeatureRule extends AccessRule {
  _PlanFeatureRule(this.feature);

  final PlanFeature feature;

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) => session.planFeatures.contains(feature);
}

final class _MfaRule extends AccessRule {
  _MfaRule(this.maxAge)
    : assert(!maxAge.isNegative, 'maxAge cannot be negative');

  final Duration maxAge;

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) {
    if (!session.isAuthenticated) return false;
    if (assumeRecentMfa) return true;
    final verifiedAt = session.mfaVerifiedAt;
    if (verifiedAt == null) return false;
    return now.difference(verifiedAt) <= maxAge;
  }
}

final class _AllRule extends AccessRule {
  _AllRule(List<AccessRule> rules) : rules = List.unmodifiable(rules);

  final List<AccessRule> rules;

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) => rules.every(
    (rule) => rule._check(session, now, assumeRecentMfa: assumeRecentMfa),
  );
}

final class _AnyRule extends AccessRule {
  _AnyRule(List<AccessRule> rules)
    : assert(rules.isNotEmpty, 'any needs at least one rule'),
      rules = List.unmodifiable(rules);

  final List<AccessRule> rules;

  @override
  bool _check(
    UserSession session,
    DateTime now, {
    required bool assumeRecentMfa,
  }) => rules.any(
    (rule) => rule._check(session, now, assumeRecentMfa: assumeRecentMfa),
  );
}
