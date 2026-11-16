import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(SessionBuilder, () {
    test('builds the default signed-in session', () {
      expect(
        SessionBuilder().build(),
        UserSession(userId: 'user-1', tenantId: 'tenant-1'),
      );
    });

    test('builds an anonymous session without a user or tenant', () {
      expect(SessionBuilder.anonymous().build(), UserSession.anonymous());
    });

    group('matches the literals it replaces', () {
      test('a billing writer', () {
        expect(
          SessionBuilder(userId: 'u1', tenantId: 't1').withPermissions({
            Permission.billingRead,
            Permission.billingWrite,
          }).build(),
          UserSession(
            userId: 'u1',
            tenantId: 't1',
            permissions: {Permission.billingRead, Permission.billingWrite},
          ),
        );
      });

      test('an assistant writer', () {
        expect(
          SessionBuilder()
              .withPermissions({Permission.tasksWrite})
              .withFeatures({PlanFeature.aiAssistant})
              .build(),
          UserSession(
            userId: 'user-1',
            tenantId: 'tenant-1',
            permissions: {Permission.tasksWrite},
            features: {PlanFeature.aiAssistant},
          ),
        );
      });

      test('a tenant admin with a fresh second factor', () {
        final now = DateTime.utc(2026, 1, 1);

        expect(
          SessionBuilder(userId: 'tenant-admin')
              .withPermissions({
                Permission.tasksRead,
                Permission.tasksWrite,
                Permission.billingRead,
              })
              .mfaVerifiedAt(now)
              .build(),
          UserSession(
            userId: 'tenant-admin',
            tenantId: 'tenant-1',
            permissions: {
              Permission.tasksRead,
              Permission.tasksWrite,
              Permission.billingRead,
            },
            mfaVerifiedAt: now,
          ),
        );
      });

      test('a platform operator without a tenant', () {
        final now = DateTime.utc(2026, 1, 1);
        final roles = {PlatformRole.values.first};

        expect(
          SessionBuilder(
            userId: 'operator',
            tenantId: null,
          ).withRoles(roles).mfaVerifiedAt(now).build(),
          UserSession(
            userId: 'operator',
            platformRoles: roles,
            mfaVerifiedAt: now,
          ),
        );
      });
    });

    test('passes flags to the session', () {
      final session = SessionBuilder().withFlags({
        FeatureFlag.values.first,
      }).build();

      expect(session.flags, {FeatureFlag.values.first});
    });

    test('adds across calls instead of replacing', () {
      final session = SessionBuilder()
          .withPermissions({Permission.billingRead})
          .withPermissions({Permission.billingWrite})
          .build();

      expect(session.permissions, {
        Permission.billingRead,
        Permission.billingWrite,
      });
    });

    test('each build is a copy the builder no longer changes', () {
      final builder = SessionBuilder().withPermissions({
        Permission.billingRead,
      });
      final first = builder.build();

      builder.withPermissions({Permission.billingWrite});

      expect(first.permissions, {Permission.billingRead});
    });
  });
}
