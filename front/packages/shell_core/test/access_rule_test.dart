import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  final reader = UserSession(
    userId: 'u1',
    tenantId: 't1',
    permissions: {Permission.tasksRead},
  );
  final full = UserSession(
    userId: 'u2',
    tenantId: 't1',
    permissions: {Permission.tasksRead, Permission.tasksWrite},
    platformRoles: {PlatformRole.support},
    features: {PlanFeature.aiAssistant},
    flags: {FeatureFlag.newReports},
  );

  group('AccessRule', () {
    test('public allows anonymous and signed-in sessions', () {
      expect(AccessRule.public().allows(UserSession.anonymous()), isTrue);
      expect(AccessRule.public().allows(reader), isTrue);
    });

    test('authenticated requires a user id', () {
      expect(
        AccessRule.authenticated().allows(UserSession.anonymous()),
        isFalse,
      );
      expect(AccessRule.authenticated().allows(reader), isTrue);
    });

    test('permissions requires every listed permission', () {
      final rule = AccessRule.permissions([
        Permission.tasksRead,
        Permission.tasksWrite,
      ]);
      expect(rule.allows(reader), isFalse);
      expect(rule.allows(full), isTrue);
    });

    test('permissions rejects an empty list', () {
      expect(() => AccessRule.permissions([]), throwsA(isA<AssertionError>()));
    });

    test('platformRoles requires at least one listed role', () {
      expect(
        AccessRule.platformRoles([
          PlatformRole.superAdmin,
          PlatformRole.support,
        ]).allows(full),
        isTrue,
      );
      expect(
        AccessRule.platformRoles([PlatformRole.finance]).allows(full),
        isFalse,
      );
    });

    test('planFeature checks the plan', () {
      expect(
        AccessRule.planFeature(PlanFeature.aiAssistant).allows(full),
        isTrue,
      );
      expect(
        AccessRule.planFeature(PlanFeature.webhooks).allows(full),
        isFalse,
      );
    });

    test('all requires every nested rule', () {
      final rule = AccessRule.all([
        AccessRule.authenticated(),
        AccessRule.permissions([Permission.tasksRead]),
        AccessRule.planFeature(PlanFeature.aiAssistant),
      ]);
      expect(rule.allows(reader), isFalse);
      expect(rule.allows(full), isTrue);
    });

    test('all requires at least one nested rule', () {
      // An empty list would allow everyone, anonymous visitors included.
      expect(() => AccessRule.all([]), throwsA(isA<AssertionError>()));
    });
  });

  group('UserSession', () {
    test('sets are unmodifiable', () {
      expect(
        () => reader.permissions.add(Permission.billingRead),
        throwsUnsupportedError,
      );
    });

    test('value equality ignores set order and is reflected in hashCode', () {
      final a = UserSession(
        userId: 'u',
        tenantId: 't',
        permissions: {Permission.tasksRead, Permission.tasksWrite},
      );
      final b = UserSession(
        userId: 'u',
        tenantId: 't',
        permissions: {Permission.tasksWrite, Permission.tasksRead},
      );
      expect(a, b);
      expect(a.hashCode, b.hashCode);
      expect(a == UserSession(userId: 'u', tenantId: 'other'), isFalse);
      expect(UserSession.anonymous(), UserSession());
    });
  });
}
