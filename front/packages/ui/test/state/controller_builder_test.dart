import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

final class _CounterController extends ChangeNotifier {
  int value = 0;
  bool disposed = false;

  void increment() {
    value++;
    notifyListeners();
  }

  @override
  void dispose() {
    disposed = true;
    super.dispose();
  }
}

void main() {
  group(ControllerBuilder, () {
    testWidgets('creates the controller once across rebuilds', (tester) async {
      var creations = 0;
      Widget build() => ControllerBuilder<_CounterController>(
        create: (_) {
          creations++;
          return _CounterController();
        },
        builder: (context, controller) => Text('${controller.value}'),
      );

      await pumpApp(tester, build());
      await pumpApp(tester, build());

      expect(creations, 1);
    });

    testWidgets('rebuilds the screen when the controller notifies', (
      tester,
    ) async {
      late _CounterController controller;
      await pumpApp(
        tester,
        ControllerBuilder<_CounterController>(
          create: (_) => controller = _CounterController(),
          builder: (context, c) => Text('${c.value}'),
        ),
      );

      controller.increment();
      await tester.pump();

      expect(find.text('1'), findsOneWidget);
    });

    testWidgets('disposes the controller when the builder leaves the tree', (
      tester,
    ) async {
      late _CounterController controller;
      await pumpApp(
        tester,
        ControllerBuilder<_CounterController>(
          create: (_) => controller = _CounterController(),
          builder: (context, c) => Text('${c.value}'),
        ),
      );

      await pumpApp(tester, const SizedBox());

      expect(controller.disposed, isTrue);
    });

    testWidgets('hands the builder the controller returned by create', (
      tester,
    ) async {
      late _CounterController controller;
      _CounterController? received;
      await pumpApp(
        tester,
        ControllerBuilder<_CounterController>(
          create: (_) => controller = _CounterController(),
          builder: (context, c) {
            received = c;
            return Text('${c.value}');
          },
        ),
      );

      expect(received, same(controller));
    });
  });
}
