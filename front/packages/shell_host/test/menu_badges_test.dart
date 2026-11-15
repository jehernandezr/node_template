import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';

import 'utils/probe_count.dart';
import 'utils/probe_manifest.dart';

void main() {
  group('MenuBadges', () {
    late MicrofrontendRegistry registry;
    late ShellEventBus bus;
    late MenuBadges badges;
    late MenuEntry entry;

    setUp(() {
      registry = MicrofrontendRegistry()
        ..register(ProbeManifest.build('alpha', withBadge: true));
      bus = ShellEventBus();
      badges = MenuBadges(registry: registry, bus: bus);
      entry = registry.manifests.single.menu.single;
    });

    test(
      'starts at zero and follows the events of its microfrontend',
      () async {
        addTearDown(badges.dispose);
        addTearDown(bus.dispose);

        expect(badges.countFor(entry), 0);

        bus.emit(const ProbeCount(4));
        await pumpEventQueue();

        expect(badges.countFor(entry), 4);
      },
    );

    test('reset returns every count to zero', () async {
      addTearDown(badges.dispose);
      addTearDown(bus.dispose);

      bus.emit(const ProbeCount(4));
      await pumpEventQueue();
      badges.reset();

      expect(badges.countFor(entry), 0);
    });

    test('entries without a badge have no count', () async {
      final plainRegistry = MicrofrontendRegistry()
        ..register(ProbeManifest.build('beta'));
      final plain = MenuBadges(registry: plainRegistry, bus: bus);
      addTearDown(plain.dispose);
      addTearDown(badges.dispose);
      addTearDown(bus.dispose);

      final plainEntry = plainRegistry.manifests.single.menu.single;

      expect(plain.countFor(plainEntry), isNull);
    });

    test('notifies the listeners of counts on each change', () async {
      addTearDown(badges.dispose);
      addTearDown(bus.dispose);

      var notifications = 0;
      badges.counts.addListener(() => notifications++);

      bus.emit(const ProbeCount(4));
      await pumpEventQueue();
      expect(notifications, 1);

      badges.reset();
      expect(notifications, 2);
    });

    test('dispose can be called twice and stops following the bus', () async {
      addTearDown(bus.dispose);

      await badges.dispose();
      bus.emit(const ProbeCount(1));
      await pumpEventQueue();
      await badges.dispose();
    });
  });
}
