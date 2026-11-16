import 'package:material_ui/material_ui.dart';

import '../state/action_runner.dart';
import 'action_error.dart';

/// Shows the outcome of an action: the [success] text on [ActionSucceeded],
/// [showActionError] on [ActionFailed] (with [failure] as its message when
/// given), nothing on [ActionSkipped]. Returns whether it showed something.
/// Does nothing if [context] is unmounted.
bool showActionResult(
  BuildContext context,
  ActionResult<Object?> result, {
  String? success,
  String? failure,
}) {
  if (!context.mounted) return false;
  return switch (result) {
    ActionSucceeded<Object?>() =>
      success != null && _SuccessSnackBar(success).show(context),
    ActionFailed<Object?>(:final error) => showActionError(
      context,
      error,
      message: failure,
    ),
    ActionSkipped<Object?>() => false,
  };
}

final class _SuccessSnackBar {
  const _SuccessSnackBar(this.text);

  final String text;

  bool show(BuildContext context) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return false;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
    return true;
  }
}
