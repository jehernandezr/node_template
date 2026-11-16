import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/account_overview_controller.dart';
import 'package:mf_account/src/shared/enums/account_enums.dart';
import 'package:mf_account/src/shared/types/account_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

final class _NoCapabilitiesRepository extends FakeAccountRepository {
  @override
  Set<AccountCapability> get capabilities => <AccountCapability>{};
}

void main() {
  group(AccountOverviewController, () {
    test('start loads the sample profile', () async {
      final controller = AccountOverviewController(FakeAccountRepository());
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.profile.valueOrNull?.name, 'Ana Pérez');
    });

    test('without the profile capability the profile is null data', () async {
      final controller = AccountOverviewController(_NoCapabilitiesRepository());
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.profile, isA<AsyncData<AccountProfile?>>());
      expect(controller.profile.valueOrNull, isNull);
      expect(controller.can(AccountCapability.security), isFalse);
    });

    test('a failed profile load becomes an error', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.loadProfile,
        );
      final controller = AccountOverviewController(
        FakeAccountRepository(behavior: behavior),
      );
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.profile, isA<AsyncError<AccountProfile?>>());
    });

    test('the sample repository serves the agreements section', () {
      final controller = AccountOverviewController(FakeAccountRepository());
      addTearDown(controller.dispose);

      expect(controller.can(AccountCapability.agreements), isTrue);
    });
  });
}
