/// Access enums shared by the backend and the front.
///
/// Each [wireCode] equals the backend value. [tryParse] returns null for codes
/// this client does not know, so new backend values are ignored safely.
library;

/// Permissions granted to a user inside a tenant.
enum Permission {
  tasksRead('tasks:read'),
  tasksWrite('tasks:write'),
  billingRead('billing:read'),
  backofficeAccess('backoffice:access');

  const Permission(this.wireCode);

  /// Value used by the backend, e.g. `tasks:read`.
  final String wireCode;

  /// Permission for [code], or null when unknown.
  static Permission? tryParse(String code) =>
      _findByWireCode(values, code, (value) => value.wireCode);
}

/// Roles that apply to the platform itself, outside any tenant.
enum PlatformRole {
  superAdmin('super_admin'),
  support('support'),
  finance('finance'),
  readOnly('read_only');

  const PlatformRole(this.wireCode);

  /// Value used by the backend, e.g. `super_admin`.
  final String wireCode;

  /// Role for [code], or null when unknown.
  static PlatformRole? tryParse(String code) =>
      _findByWireCode(values, code, (value) => value.wireCode);
}

/// Features included in a tenant plan.
enum PlanFeature {
  aiAssistant('ai_assistant'),
  webhooks('webhooks'),
  billing('billing');

  const PlanFeature(this.wireCode);

  /// Value used by the backend, e.g. `ai_assistant`.
  final String wireCode;

  /// Feature for [code], or null when unknown.
  static PlanFeature? tryParse(String code) =>
      _findByWireCode(values, code, (value) => value.wireCode);
}

/// Feature flags that gate parts of the product.
enum FeatureFlag {
  newReports('new_reports');

  const FeatureFlag(this.wireCode);

  /// Value used by the backend, e.g. `new_reports`.
  final String wireCode;

  /// Flag for [code], or null when unknown.
  static FeatureFlag? tryParse(String code) =>
      _findByWireCode(values, code, (value) => value.wireCode);
}

T? _findByWireCode<T extends Enum>(
  Iterable<T> values,
  String code,
  String Function(T value) wireCodeOf,
) {
  for (final value in values) {
    if (wireCodeOf(value) == code) return value;
  }
  return null;
}
