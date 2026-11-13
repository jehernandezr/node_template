import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';

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
/// `ApiErrorException`; otherwise the localized `errorFallback` of
/// [AppLocalizations]. The error code
/// of an `ApiErrorException` is appended for support. Raw exception text is
/// never shown.
bool showActionError(BuildContext context, Object error, {String? message}) {
  if (!context.mounted) return false;
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return false;

  final problem = error is ApiErrorException ? error.problem : null;
  final text =
      message ??
      problem?.detail ??
      problem?.title ??
      AppLocalizations.of(context).errorFallback;
  final code = problem?.code;
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(content: Text(code == null ? text : '$text ($code)')),
    );
  return true;
}

/// Localized message for the failure of a user action.
///
/// An `ApiErrorException` gives the catalog message of its code, a
/// `ContractViolationException` the generic invalid input message, and any
/// other error (network, timeout...) the `errorFallback` text. Pair it with
/// [showActionError] when the screen has no message of its own.
String actionErrorMessage(AppLocalizations l10n, Object error) =>
    switch (error) {
      ApiErrorException(:final problem) => errorMessage(l10n, problem.code),
      ContractViolationException(inResponse: false) => errorMessage(
        l10n,
        PlatformErrorCode.validationInvalidInput.code,
      ),
      _ => l10n.errorFallback,
    };
