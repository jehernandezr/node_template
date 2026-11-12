import 'package:contracts/contracts.dart';

import 'user_session.dart';

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

  /// Allows sessions that satisfy every rule in [rules].
  factory AccessRule.all(List<AccessRule> rules) = _AllRule;

  /// Allows sessions that satisfy at least one rule in [rules].
  factory AccessRule.any(List<AccessRule> rules) = _AnyRule;

  /// Whether [session] satisfies this rule.
  bool allows(UserSession session);
}

final class _PublicRule extends AccessRule {
  _PublicRule();

  @override
  bool allows(UserSession session) => true;
}

final class _AuthenticatedRule extends AccessRule {
  _AuthenticatedRule();

  @override
  bool allows(UserSession session) => session.isAuthenticated;
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
  bool allows(UserSession session) =>
      permissions.every(session.permissions.contains);
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
  bool allows(UserSession session) =>
      permissions.any(session.permissions.contains);
}

final class _PlatformRolesRule extends AccessRule {
  _PlatformRolesRule(List<PlatformRole> roles)
    : assert(roles.isNotEmpty, 'platformRoles needs at least one role'),
      roles = List.unmodifiable(roles);

  final List<PlatformRole> roles;

  @override
  bool allows(UserSession session) => roles.any(session.platformRoles.contains);
}

final class _PlanFeatureRule extends AccessRule {
  _PlanFeatureRule(this.feature);

  final PlanFeature feature;

  @override
  bool allows(UserSession session) => session.planFeatures.contains(feature);
}

final class _AllRule extends AccessRule {
  _AllRule(List<AccessRule> rules) : rules = List.unmodifiable(rules);

  final List<AccessRule> rules;

  @override
  bool allows(UserSession session) =>
      rules.every((rule) => rule.allows(session));
}

final class _AnyRule extends AccessRule {
  _AnyRule(List<AccessRule> rules)
    : assert(rules.isNotEmpty, 'any needs at least one rule'),
      rules = List.unmodifiable(rules);

  final List<AccessRule> rules;

  @override
  bool allows(UserSession session) => rules.any((rule) => rule.allows(session));
}
