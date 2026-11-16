import 'package:flutter/widgets.dart';

/// Owns a controller for the life of the widget: creates it once, listens to
/// it, rebuilds on change and disposes it. A screen built with it can be a
/// `StatelessWidget`.
class ControllerBuilder<C extends ChangeNotifier> extends StatefulWidget {
  /// Creates the builder.
  const ControllerBuilder({
    super.key,
    required this.create,
    required this.builder,
  });

  /// Called once, in `initState`. It may read inherited widgets only with
  /// lookups that do not subscribe, such as `getInheritedWidgetOfExactType`.
  final C Function(BuildContext context) create;

  /// Builds the screen from the current state of the controller.
  final Widget Function(BuildContext context, C controller) builder;

  @override
  State<ControllerBuilder<C>> createState() => _ControllerBuilderState<C>();
}

class _ControllerBuilderState<C extends ChangeNotifier>
    extends State<ControllerBuilder<C>> {
  late final C _controller;

  @override
  void initState() {
    super.initState();
    _controller = widget.create(context);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _controller,
    builder: (context, _) => widget.builder(context, _controller),
  );
}
