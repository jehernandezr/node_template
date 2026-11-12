import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  final now = DateTime.utc(2026, 11, 12, 10);
  final admin = UserSession(
    userId: 'admin',
    platformRoles: {PlatformRole.superAdmin},
  );
  final mfa = AccessRule.mfa(const Duration(minutes: 15));
  final backoffice = AccessRule.all([
    AccessRule.platformRoles([PlatformRole.superAdmin, PlatformRole.support]),
    mfa,
  ]);

  group('AccessRule.mfa', () {
    test('needs a second factor verified within maxAge', () {
      expect(mfa.allows(admin, now: now), isFalse, reason: 'never verified');
      expect(
        mfa.allows(
          admin.withMfaVerifiedAt(now.subtract(const Duration(minutes: 15))),
          now: now,
        ),
        isTrue,
      );
      expect(
        mfa.allows(
          admin.withMfaVerifiedAt(now.subtract(const Duration(minutes: 16))),
          now: now,
        ),
        isFalse,
      );
    });

    test('never allows an anonymous session', () {
      final anonymous = UserSession(mfaVerifiedAt: now);
      expect(mfa.allows(anonymous, now: now), isFalse);
      expect(mfa.decide(anonymous, now: now), AccessDecision.signInRequired);
    });

    test('decide asks for a step-up only when MFA is the missing piece', () {
      expect(backoffice.decide(admin, now: now), AccessDecision.stepUpRequired);
      expect(
        backoffice.decide(admin.withMfaVerifiedAt(now), now: now),
        AccessDecision.allowed,
      );
      final customer = UserSession(userId: 'c', tenantId: 't');
      expect(backoffice.decide(customer, now: now), AccessDecision.denied);
      expect(
        backoffice.decide(UserSession.anonymous(), now: now),
        AccessDecision.signInRequired,
      );
    });

    test('reachableBy counts a stale second factor as passed', () {
      expect(backoffice.reachableBy(admin, now: now), isTrue);
      expect(
        backoffice.reachableBy(
          UserSession(userId: 'c', tenantId: 't'),
          now: now,
        ),
        isFalse,
      );
    });

    test(
      'any() with an MFA branch steps up only if no other branch passes',
      () {
        final rule = AccessRule.any([
          AccessRule.permissions([Permission.tasksWrite]),
          mfa,
        ]);
        final writer = UserSession(
          userId: 'w',
          tenantId: 't',
          permissions: {Permission.tasksWrite},
        );
        expect(rule.decide(writer, now: now), AccessDecision.allowed);
        expect(rule.decide(admin, now: now), AccessDecision.stepUpRequired);
      },
    );
  });

  group('UserSession.mfaVerifiedAt', () {
    test('withMfaVerifiedAt keeps the identity and access data', () {
      final full = UserSession(
        userId: 'u',
        tenantId: 't',
        permissions: {Permission.tasksRead},
        platformRoles: {PlatformRole.support},
        planFeatures: {PlanFeature.billing},
        featureFlags: {FeatureFlag.newReports},
      );
      final verified = full.withMfaVerifiedAt(now);
      expect(verified.mfaVerifiedAt, now);
      expect(
        UserSession(
          userId: 'u',
          tenantId: 't',
          permissions: {Permission.tasksRead},
          platformRoles: {PlatformRole.support},
          planFeatures: {PlanFeature.billing},
          featureFlags: {FeatureFlag.newReports},
          mfaVerifiedAt: now,
        ),
        verified,
      );
    });

    test('takes part in equality, so a step-up notifies listeners', () {
      expect(admin.withMfaVerifiedAt(now), isNot(admin));
      expect(
        admin.withMfaVerifiedAt(now).hashCode,
        admin.withMfaVerifiedAt(now).hashCode,
      );
    });
  });

  group('MicrofrontendRegistry with an MFA rule', () {
    test('the menu keeps the entry; visibility needs a fresh factor', () {
      final registry = MicrofrontendRegistry()
        ..register(
          MicrofrontendManifest(
            id: MicrofrontendId.backoffice,
            platforms: {AppPlatform.web},
            access: backoffice,
            menu: const [
              MenuEntry(
                labelKey: 'menuBackoffice',
                path: '/backoffice',
                order: 1,
              ),
            ],
          ),
        );
      expect(registry.menuFor(admin, AppPlatform.web, now: now), hasLength(1));
      expect(registry.visibleFor(admin, AppPlatform.web, now: now), isEmpty);
      expect(
        registry.visibleFor(
          admin.withMfaVerifiedAt(now),
          AppPlatform.web,
          now: now,
        ),
        hasLength(1),
      );
    });
  });
}
