import 'package:contracts/contracts.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';

void main() {
  group(ErrorPresenter, () {
    final l10n = lookupAppLocalizations(const Locale('es'));
    final presenter = ErrorPresenter(l10n);

    group('describe', () {
      test('an API error gives the catalog message, its code and trace id', () {
        const problem = ProblemDetails(
          type: 'about:blank',
          title: 'Forbidden',
          detail: 'Server text, never shown',
          status: 403,
          code: 'PLATFORM.AUTH.FORBIDDEN',
          traceId: 'trace-1',
        );
        final details = presenter.describe(
          const ApiErrorException(problem),
          fallbackMessage: 'ignored',
        );
        expect(details.message, errorMessage(l10n, 'PLATFORM.AUTH.FORBIDDEN'));
        expect(details.code, 'PLATFORM.AUTH.FORBIDDEN');
        expect(details.traceId, 'trace-1');
      });

      test('a request that failed validation gives the invalid input text', () {
        final details = presenter.describe(
          const ContractViolationException(routeId: 'x', errors: []),
        );
        expect(
          details.message,
          errorMessage(l10n, PlatformErrorCode.validationInvalidInput.code),
        );
        expect(details.code, isNull);
      });

      test('a response that failed validation gives the generic text', () {
        final details = presenter.describe(
          const ContractViolationException(
            routeId: 'x',
            errors: [],
            inResponse: true,
          ),
        );
        expect(details.message, l10n.errorFallback);
      });

      test('any other error gives the fallback message, then the generic', () {
        expect(
          presenter
              .describe(Exception('offline'), fallbackMessage: 'Sin red')
              .message,
          'Sin red',
        );
        final generic = presenter.describe(Exception('offline'));
        expect(generic.message, l10n.errorFallback);
        expect(generic.code, isNull);
        expect(generic.traceId, isNull);
      });
    });

    test('actionMessage matches describe', () {
      expect(presenter.actionMessage(Object()), l10n.errorFallback);
    });
  });
}
