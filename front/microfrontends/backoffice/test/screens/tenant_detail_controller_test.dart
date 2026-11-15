import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/screens/tenant_detail_controller.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_backoffice_repository.dart';

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

  group(TenantDetailController, () {
    test('loads the tenant and its audit in parallel', () async {
      final tenantGate = gated.holdNext(BackofficeOperation.tenant);
      final auditGate = gated.holdNext(BackofficeOperation.tenantAudit);
      final controller = TenantDetailController(gated, tenantId: 't-001');
      addTearDown(controller.dispose);

      unawaited(controller.start());
      await pumpEventQueue();

      expect(gated.started, [
        BackofficeOperation.tenant,
        BackofficeOperation.tenantAudit,
      ]);

      tenantGate.complete();
      auditGate.complete();
      await pumpEventQueue();

      final detail = controller.detail;
      expect(detail, isA<AsyncData<TenantWithAudit>>());
      final loaded = (detail as AsyncData<TenantWithAudit>).value;
      expect(loaded.tenant?.id, 't-001');
      expect(loaded.audit, hasLength(2));
    });

    test('an unknown tenant loads with a null tenant', () async {
      final controller = TenantDetailController(fake, tenantId: 't-999');
      addTearDown(controller.dispose);

      await controller.start();

      final detail = controller.detail;
      expect(detail, isA<AsyncData<TenantWithAudit>>());
      expect((detail as AsyncData<TenantWithAudit>).value.tenant, isNull);
    });

    test(
      'a failed audit load surfaces the API error, not a parallel wait error',
      () async {
        behavior.failNext(
          ApiErrorException(ProblemFixtures.unavailable()),
          operation: BackofficeOperation.tenantAudit,
        );
        final controller = TenantDetailController(fake, tenantId: 't-001');
        addTearDown(controller.dispose);

        await controller.start();

        final detail = controller.detail;
        expect(detail, isA<AsyncError<TenantWithAudit>>());
        expect(
          (detail as AsyncError<TenantWithAudit>).error,
          isA<ApiErrorException>(),
        );

        await controller.start();
        expect(controller.detail, isA<AsyncData<TenantWithAudit>>());
      },
    );
  });
}
