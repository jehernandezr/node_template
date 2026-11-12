import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('every access enum parses its own wire codes', () {
    for (final permission in Permission.values) {
      expect(Permission.tryParse(permission.wireCode), permission);
    }
    for (final role in PlatformRole.values) {
      expect(PlatformRole.tryParse(role.wireCode), role);
    }
    for (final feature in PlanFeature.values) {
      expect(PlanFeature.tryParse(feature.wireCode), feature);
    }
    for (final flag in FeatureFlag.values) {
      expect(FeatureFlag.tryParse(flag.wireCode), flag);
    }
  });

  test('wire codes match the backend style', () {
    expect(Permission.tasksRead.wireCode, 'tasks:read');
    expect(PlatformRole.superAdmin.wireCode, 'super_admin');
    expect(PlanFeature.aiAssistant.wireCode, 'ai_assistant');
    expect(FeatureFlag.newReports.wireCode, 'new_reports');
  });

  test('tryParse returns null for unknown codes', () {
    expect(Permission.tryParse('tasks:delete'), isNull);
    expect(PlatformRole.tryParse('owner'), isNull);
    expect(PlanFeature.tryParse(''), isNull);
    expect(FeatureFlag.tryParse('NEW_REPORTS'), isNull);
  });
}
