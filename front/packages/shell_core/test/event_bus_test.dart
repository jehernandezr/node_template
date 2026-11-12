import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

final class TaskCreated extends ShellEvent {
  const TaskCreated(this.taskId);

  final String taskId;
}

final class SessionChanged extends ShellEvent {
  const SessionChanged();
}

final class ThemeChanged extends ReplayableShellEvent {
  const ThemeChanged(this.theme);

  final String theme;
}

void main() {
  test('on<T> delivers only events of type T', () async {
    final bus = ShellEventBus();
    final received = <TaskCreated>[];
    final subscription = bus.on<TaskCreated>().listen(received.add);

    bus
      ..emit(const SessionChanged())
      ..emit(const TaskCreated('a'))
      ..emit(const TaskCreated('b'));
    await Future<void>.delayed(Duration.zero);

    expect(received.map((e) => e.taskId), ['a', 'b']);
    await subscription.cancel();
    await bus.dispose();
  });

  test(
    'replay delivers the latest replayable event to a late listener',
    () async {
      final bus = ShellEventBus()
        ..emit(const ThemeChanged('light'))
        ..emit(const ThemeChanged('dark'));

      final themes = <String>[];
      final subscription = bus
          .on<ThemeChanged>(replay: true)
          .listen((event) => themes.add(event.theme));
      await Future<void>.delayed(Duration.zero);
      expect(themes, ['dark']);

      final withoutReplay = <String>[];
      final other = bus.on<ThemeChanged>().listen(
        (event) => withoutReplay.add(event.theme),
      );
      await Future<void>.delayed(Duration.zero);
      expect(withoutReplay, isEmpty);

      await subscription.cancel();
      await other.cancel();
      await bus.dispose();
    },
  );

  test('replay ignores events that are not replayable', () async {
    final bus = ShellEventBus()..emit(const TaskCreated('a'));
    final received = <TaskCreated>[];
    final subscription = bus.on<TaskCreated>(replay: true).listen(received.add);
    await Future<void>.delayed(Duration.zero);
    expect(received, isEmpty);
    await subscription.cancel();
    await bus.dispose();
  });

  test('clearReplay forgets stored events but keeps live delivery', () async {
    final bus = ShellEventBus()..emit(const ThemeChanged('dark'));
    bus.clearReplay();

    final replayed = <String>[];
    final subscription = bus
        .on<ThemeChanged>(replay: true)
        .listen((event) => replayed.add(event.theme));
    await Future<void>.delayed(Duration.zero);
    expect(replayed, isEmpty);

    bus.emit(const ThemeChanged('light'));
    await Future<void>.delayed(Duration.zero);
    expect(replayed, ['light']);

    await subscription.cancel();
    await bus.dispose();
  });

  test('emit after dispose is a no-op', () async {
    final bus = ShellEventBus();
    await bus.dispose();
    expect(() => bus.emit(const SessionChanged()), returnsNormally);
  });

  test('dispose completes listeners', () async {
    final bus = ShellEventBus();
    final done = Completer<void>();
    bus.on<SessionChanged>().listen(null, onDone: done.complete);
    await bus.dispose();
    await done.future;
  });
}
