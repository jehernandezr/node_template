import 'package:contracts/contracts.dart';
import 'package:material_ui/material_ui.dart';

/// Message used when neither the caller nor the error gives one.
const String defaultActionErrorMessage = 'Algo salió mal. Intenta de nuevo.';

/// Shows [error] of a user action (save, delete, send...) in a [SnackBar].
///
/// Call it right after the `await` that failed, with the screen's context:
///
/// ```dart
/// try {
///   await repository.save(draft);
/// } catch (error) {
///   showActionError(context, error, message: l10n.saveError);
/// }
/// ```
///
/// It does nothing and returns false when [context] is no longer mounted (the
/// screen was closed or rebuilt for another identity while the action ran) or
/// when there is no [ScaffoldMessenger]. Otherwise it replaces the current
/// snack bar and returns true.
///
/// The text is [message] when given; otherwise the `detail` (or `title`) of an
/// `ApiErrorException`; otherwise [defaultActionErrorMessage]. The error code
/// of an `ApiErrorException` is appended for support. Raw exception text is
/// never shown.
bool showActionError(BuildContext context, Object error, {String? message}) {
  if (!context.mounted) return false;
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return false;

  final problem = error is ApiErrorException ? error.problem : null;
  final text =
      message ?? problem?.detail ?? problem?.title ?? defaultActionErrorMessage;
  final code = problem?.code;
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(content: Text(code == null ? text : '$text ($code)')),
    );
  return true;
}
