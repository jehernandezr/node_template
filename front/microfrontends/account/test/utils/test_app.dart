import 'package:api/api.dart';
import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/l10n/generated/account_localizations.dart';
import 'package:mf_account/src/screens/step_up_gate.dart';
import 'package:mf_account/src/shared/constants/account_access.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// App with the shared texts, and the account texts installed on [home] the
/// way the manifest installs them, in Spanish.
///
/// The account delegates sit in a [DeferredLocalizations] around [home] and
/// not in the app, so a dialog opened without `showLocalizedDialog` misses
/// them here as it would in the shell.
///
/// [session] is what `context.can` and `AccessGate` see; by default it has no
/// recent second factor. [clock] is the time of the shell scope: use the same
/// [FakeClock] for [testSession] so a fresh second factor stays fresh.
Widget testApp(
  Widget home, {
  UserSession? session,
  Locale locale = const Locale('es'),
  FakeClock? clock,
}) =>
    TestApp(
      locale: locale,
      session: session ?? testSession(clock: clock),
      clock: (clock ?? FakeClock()).now,
    ).wrap(
      DeferredLocalizations(
        delegates: const [AccountLocalizations.delegate],
        child: home,
      ),
    );

Future<AccountLocalizations> loadEs() =>
    AccountLocalizations.delegate.load(const Locale('es'));

Future<AccountLocalizations> loadEn() =>
    AccountLocalizations.delegate.load(const Locale('en'));

Future<AppLocalizations> loadSharedEs() =>
    AppLocalizations.delegate.load(const Locale('es'));

/// Test session. With [mfaFresh] the second factor was verified at the time
/// of [clock] (a default [FakeClock] when null).
UserSession testSession({bool mfaFresh = false, FakeClock? clock}) {
  final builder = SessionBuilder();
  if (mfaFresh) builder.mfaVerifiedAt((clock ?? FakeClock()).now());
  return builder.build();
}

/// Scope of a test identity in demo mode. Each call creates a new scope.
MicrofrontendScope testScope({
  Future<void> Function()? onSignOut,
  Future<bool> Function()? onStepUp,
}) => MicrofrontendScope(
  ShellServices(
    session: testSession(),
    mode: ShellMode.demo,
    onSignOut: onSignOut,
    onStepUp: onStepUp,
  ),
);

/// Scope of a test identity in live mode, with [api].
MicrofrontendScope liveScope(ApiClient api) => MicrofrontendScope(
  ShellServices(session: testSession(), mode: ShellMode.live, api: api),
);

/// API error with a known code and trace id.
ApiErrorException testApiError({String code = 'PLATFORM.AUTH.FORBIDDEN'}) =>
    ApiErrorException(ProblemFixtures.withCode(code, status: 403));

/// Shell step-up that always completes.
Future<bool> approveStepUp() async => true;

/// Gate for controller tests. By default the session has no recent second
/// factor, so [request] decides (it answers true when null).
StepUpGate testStepUpGate({
  UserSession? session,
  FakeClock? clock,
  Future<bool> Function()? request,
}) => StepUpGate(
  rule: accountStepUpRule,
  session: ValueNotifier(session ?? testSession(clock: clock)),
  clock: (clock ?? FakeClock()).now,
  request: request ?? approveStepUp,
);
