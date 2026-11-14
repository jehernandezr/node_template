import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';

import 'generated/app_localizations.dart';
import 'generated/error_messages.dart';

/// What to show for a failure: a localized [message] plus the stable [code]
/// and [traceId] a user can quote to support.
@immutable
final class ErrorDetails {
  /// Creates the details. [code] and [traceId] are absent for errors that do
  /// not come from the API.
  const ErrorDetails({required this.message, this.code, this.traceId});

  /// Localized text for the user. Never the server's own text.
  final String message;

  /// Stable error code, such as `IDENTITY.MFA.CODE_EXPIRED`.
  final String? code;

  /// Trace id returned by the API for the failed request.
  final String? traceId;
}

/// Turns an error into text the user can read, using the shared catalog.
final class ErrorPresenter {
  /// Creates a presenter that writes in the language of [l10n].
  const ErrorPresenter(this.l10n);

  /// Shared localized texts.
  final AppLocalizations l10n;

  /// Message, code and trace id to show for [error].
  ///
  /// An `ApiErrorException` gives the catalog message of its code. A request
  /// that failed contract validation gives the invalid input message. Anything
  /// else gives [fallbackMessage], or the generic text when it is null.
  ErrorDetails describe(Object error, {String? fallbackMessage}) =>
      switch (error) {
        ApiErrorException(:final problem) => ErrorDetails(
          message: errorMessageFor(l10n, problem.code),
          code: problem.code,
          traceId: problem.traceId,
        ),
        ContractViolationException(inResponse: false) => ErrorDetails(
          message: errorMessageFor(
            l10n,
            PlatformErrorCode.validationInvalidInput.code,
          ),
        ),
        _ => ErrorDetails(message: fallbackMessage ?? l10n.errorFallback),
      };

  /// Message of a failed user action.
  String actionMessage(Object error) => describe(error).message;
}
