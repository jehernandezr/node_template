import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/shared/enums/account_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(FakeAccountRepository, () {
    test(
      'the current session is seen now, the others when they were',
      () async {
        final clock = FakeClock(DateTime.utc(2030, 1, 1));
        final repository = FakeAccountRepository(
          behavior: DemoBehavior(clock: clock.now),
        );
        addTearDown(repository.dispose);

        final sessions = await repository.listSessions();

        final current = sessions.firstWhere((session) => session.current);
        expect(current.lastSeenAt, DateTime.utc(2030, 1, 1));
        final iphone = sessions.firstWhere(
          (session) => session.id == FakeAccountRepository.sampleSessionIds[1],
        );
        expect(iphone.lastSeenAt, DateTime.utc(2029, 12, 31, 22));
      },
    );

    test('a new passkey takes the time of the demo clock', () async {
      final clock = FakeClock(DateTime.utc(2030, 1, 1));
      final repository = FakeAccountRepository(
        behavior: DemoBehavior(clock: clock.now),
      );
      addTearDown(repository.dispose);

      clock.advance(const Duration(days: 1));
      await repository.addPasskey();

      final security = await repository.loadSecurity();
      expect(security.passkeys.last.createdAt, clock.now());
    });

    test(
      'a failure programmed for one operation leaves the others working',
      () async {
        final behavior = DemoBehavior(clock: FakeClock().now)
          ..failNext(
            const FakeFailure(),
            operation: AccountOperation.listDevices,
          );
        final repository = FakeAccountRepository(behavior: behavior);
        addTearDown(repository.dispose);

        await expectLater(
          repository.listDevices(),
          throwsA(isA<FakeFailure>()),
        );
        final sessions = await repository.listSessions();
        expect(sessions, isNotEmpty);
        final devices = await repository.listDevices();
        expect(devices, hasLength(2));
      },
    );

    test('a disposed repository refuses to serve', () async {
      final repository = FakeAccountRepository();

      repository.dispose();

      expect(repository.isDisposed, isTrue);
      await expectLater(
        repository.listSessions(),
        throwsA(isA<DemoDisposedException>()),
      );
    });

    test('revoking the other sessions keeps only the current one', () async {
      final repository = FakeAccountRepository();
      addTearDown(repository.dispose);

      final closed = await repository.revokeOtherSessions();

      expect(closed, 2);
      final sessions = await repository.listSessions();
      expect(sessions, hasLength(1));
      expect(sessions.single.current, isTrue);
    });
  });
}
