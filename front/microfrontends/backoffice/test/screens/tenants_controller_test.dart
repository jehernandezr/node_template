import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/screens/tenants_controller.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_backoffice_repository.dart';

List<String> _ids(AsyncValue<List<Tenant>> value) => [
  for (final tenant in value.valueOrNull ?? const <Tenant>[]) tenant.id,
];

void main() {
  late FakeClock clock;
  late DemoBehavior behavior;
  late FakeBackofficeRepository fake;
  late GatedBackofficeRepository gated;

  setUp(() {
    clock = FakeClock();
    behavior = DemoBehavior(clock: clock.now);
    fake = FakeBackofficeRepository(behavior: behavior);
    gated = GatedBackofficeRepository(fake);
  });

  group(TenantsController, () {
    test('loads the five seeded tenants', () async {
      final controller = TenantsController(fake);
      addTearDown(controller.dispose);

      await controller.start();

      expect(_ids(controller.tenants), [
        't-001',
        't-002',
        't-003',
        't-004',
        't-005',
      ]);
    });

    test('search keeps only the tenants whose name or id match', () async {
      final controller = TenantsController(fake);
      addTearDown(controller.dispose);

      await controller.search('acme');

      expect(_ids(controller.tenants), ['t-001']);
      expect(controller.query, 'acme');
    });

    test('region filter keeps the tenants of that region', () async {
      final controller = TenantsController(fake);
      addTearDown(controller.dispose);

      await controller.filterByRegion(TenantRegion.saEast);

      expect(_ids(controller.tenants), ['t-002', 't-004']);
      expect(controller.region, TenantRegion.saEast);
    });

    test('status filter keeps the tenants with that status', () async {
      final controller = TenantsController(fake);
      addTearDown(controller.dispose);

      await controller.filterByStatus(TenantStatus.suspended);

      expect(_ids(controller.tenants), ['t-003']);
      expect(controller.status, TenantStatus.suspended);
    });

    test('an answer to an older search does not replace a newer one', () async {
      final gate = gated.holdNext(BackofficeOperation.listTenants);
      final controller = TenantsController(gated);
      addTearDown(controller.dispose);

      unawaited(controller.search('a'));
      await controller.search('acme');
      gate.complete();
      await pumpEventQueue();

      expect(_ids(controller.tenants), ['t-001']);
    });

    test('a failed load reports the error and start recovers', () async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.listTenants,
      );
      final controller = TenantsController(fake);
      addTearDown(controller.dispose);

      await controller.start();
      expect(controller.tenants, isA<AsyncError<List<Tenant>>>());

      await controller.start();
      expect(_ids(controller.tenants), hasLength(5));
    });
  });
}
