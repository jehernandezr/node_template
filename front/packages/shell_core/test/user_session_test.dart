import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  group('UserSession.fromAccess', () {
    final verifiedAt = DateTime.utc(2026, 11, 13, 12);

    Map<String, dynamic> accessJson({String? mfaVerifiedAt, String? extra}) => {
      'userId': '0193f1c2-0000-7000-8000-0000000000a1',
      'tenantId': '0193f1c2-0000-7000-8000-0000000000b1',
      'sessionId': '0193f1c2-0000-7000-8000-0000000000c1',
      'permissions': ['tasks:read', 'billing:read', 'billing:write', ?extra],
      'platformRoles': ['support'],
      'features': ['billing', 'ai_assistant'],
      'flags': ['new_reports'],
      'mfaVerifiedAt': mfaVerifiedAt,
    };

    test('copies identity, permissions, roles, plan, flags and MFA time', () {
      final valid = accessJson(mfaVerifiedAt: '2026-11-13T12:00:00.000Z');
      expect(SessionAccessSchema.validate(valid), isEmpty);
      final json = accessJson(
        mfaVerifiedAt: '2026-11-13T12:00:00.000Z',
        extra: 'x:new',
      );

      final session = UserSession.fromAccess(SessionAccess.fromJson(json));

      expect(session.userId, '0193f1c2-0000-7000-8000-0000000000a1');
      expect(session.tenantId, '0193f1c2-0000-7000-8000-0000000000b1');
      // `x:new` is unknown to this client and is dropped.
      expect(session.permissions, {
        Permission.tasksRead,
        Permission.billingRead,
        Permission.billingWrite,
      });
      expect(session.platformRoles, {PlatformRole.support});
      expect(session.planFeatures, {
        PlanFeature.billing,
        PlanFeature.aiAssistant,
      });
      expect(session.featureFlags, {FeatureFlag.newReports});
      expect(session.mfaVerifiedAt, verifiedAt);
      expect(session.isAuthenticated, isTrue);
    });

    test('the mapped session drives the access rules', () {
      final session = UserSession.fromAccess(
        SessionAccess.fromJson(
          accessJson(mfaVerifiedAt: '2026-11-13T12:00:00.000Z'),
        ),
      );
      final recent = AccessRule.mfa(
        const Duration(minutes: MfaRules.stepUpMaxAgeMinutes),
      );

      expect(
        AccessRule.permissions([Permission.billingWrite]).allows(session),
        isTrue,
      );
      expect(
        AccessRule.planFeature(PlanFeature.aiAssistant).allows(session),
        isTrue,
      );
      expect(
        recent.decide(session, now: verifiedAt.add(const Duration(minutes: 5))),
        AccessDecision.allowed,
      );
      expect(
        recent.decide(
          session,
          now: verifiedAt.add(const Duration(minutes: 30)),
        ),
        AccessDecision.stepUpRequired,
      );
    });

    test('without a second factor mfaVerifiedAt stays null', () {
      final session = UserSession.fromAccess(
        SessionAccess.fromJson(accessJson()),
      );

      expect(session.mfaVerifiedAt, isNull);
      expect(
        AccessRule.mfa(const Duration(minutes: 10)).decide(session),
        AccessDecision.stepUpRequired,
      );
    });

    test('equal access gives equal sessions', () {
      final json = accessJson(mfaVerifiedAt: '2026-11-13T12:00:00.000Z');
      expect(
        UserSession.fromAccess(SessionAccess.fromJson(json)),
        UserSession.fromAccess(SessionAccess.fromJson(json)),
      );
    });
  });
}
