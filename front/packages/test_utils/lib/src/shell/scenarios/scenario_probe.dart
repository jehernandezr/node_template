import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

/// Microfrontend the shared scenarios drive: one screen per thing they check,
/// served on every platform and in demo and live modes.
final class ScenarioProbe {
  /// Creates the probe.
  const ScenarioProbe();

  /// Id of the probe microfrontend.
  static const MicrofrontendId id = MicrofrontendId('probe');

  /// Home of the probe: shows `usuario <userId>`, copied once in its state.
  static const String home = '/probe';

  /// Requires a verified second factor: shows `zona segura`.
  static const String secure = '/probe/secure';

  /// Requires `Permission.backofficeAccess`.
  static const String restricted = '/probe/restricted';

  /// Button `ask step-up` asks `scope.services.requestStepUp()` and shows
  /// `step-up: <answer>`.
  static const String sensitive = '/probe/sensitive';

  /// Shows [modeText] and, in live mode, [clientText] of its `ApiClient`.
  static const String api = '/probe/api';

  /// Title of the home page.
  static const String homeTitle = 'Probe';

  /// Body of the secure page.
  static const String secureText = 'secure area';

  /// Body of the sensitive page before it asks.
  static const String notAsked = 'not asked';

  /// Button of the sensitive page.
  static const String askStepUp = 'ask step-up';

  /// Body of the home page for [userId].
  static String userText(String userId) => 'user $userId';

  /// Body of the sensitive page once the step-up answered [verified].
  static String stepUpText({required bool verified}) => 'step-up: $verified';

  /// Line of the api page with the shell mode.
  static String modeText(ShellMode mode) => 'mode: ${mode.name}';

  /// Line of the api page, in live mode, that identifies the client the
  /// screen received, so a scenario can tell it is the connection's own.
  static String clientText(Object client) =>
      'client: ${identityHashCode(client)}';

  static const String _restrictedText = 'restricted area';
  static const String _secureTitle = 'Secure';
  static const String _restrictedTitle = 'Restricted';
  static const String _sensitiveTitle = 'Sensitive action';
  static const String _apiTitle = 'Api';

  /// The manifest, for `AppPlatform.web` and `AppPlatform.mobile`.
  MicrofrontendManifest manifest() => MicrofrontendManifest(
    id: id,
    platforms: {AppPlatform.web, AppPlatform.mobile},
    access: AccessRule.authenticated(),
    menu: const [],
    screens: [
      ScreenRoute(
        path: home,
        loadLibrary: _noLibrary,
        builder: (scope, {params = const {}}) =>
            _ProbeScreen(userId: scope.services.session.userId!),
        routes: [
          ScreenRoute(
            path: 'secure',
            access: AccessRule.mfa(const Duration(minutes: 10)),
            loadLibrary: _noLibrary,
            builder: (scope, {params = const {}}) => const AppPage(
              title: _secureTitle,
              body: Text(ScenarioProbe.secureText),
            ),
          ),
          ScreenRoute(
            path: 'restricted',
            access: AccessRule.permissions(const [Permission.backofficeAccess]),
            loadLibrary: _noLibrary,
            builder: (scope, {params = const {}}) => const AppPage(
              title: _restrictedTitle,
              body: Text(_restrictedText),
            ),
          ),
          ScreenRoute(
            path: 'sensitive',
            loadLibrary: _noLibrary,
            builder: (scope, {params = const {}}) =>
                _SensitiveScreen(requestStepUp: scope.services.requestStepUp),
          ),
          ScreenRoute(
            path: 'api',
            loadLibrary: _noLibrary,
            builder: (scope, {params = const {}}) => AppPage(
              title: _apiTitle,
              body: Column(
                children: [
                  Text(modeText(scope.services.mode)),
                  if (scope.services.mode == ShellMode.live)
                    Text(clientText(scope.services.api)),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  );

  static Future<void> _noLibrary() async {}
}

/// Copies the user id into its state once, like a screen that loads data in
/// `initState`. Only a rebuild from scratch shows another user.
class _ProbeScreen extends StatefulWidget {
  const _ProbeScreen({required this.userId});

  final String userId;

  @override
  State<_ProbeScreen> createState() => _ProbeScreenState();
}

class _ProbeScreenState extends State<_ProbeScreen> {
  late final String _loadedFor = widget.userId;

  @override
  Widget build(BuildContext context) => AppPage(
    title: ScenarioProbe.homeTitle,
    body: Text(ScenarioProbe.userText(_loadedFor)),
  );
}

/// Asks the shell for a step-up, as a sensitive action does, and shows the
/// answer.
class _SensitiveScreen extends StatefulWidget {
  const _SensitiveScreen({required this.requestStepUp});

  final Future<bool> Function() requestStepUp;

  @override
  State<_SensitiveScreen> createState() => _SensitiveScreenState();
}

class _SensitiveScreenState extends State<_SensitiveScreen> {
  String _result = ScenarioProbe.notAsked;

  Future<void> _ask() async {
    final verified = await widget.requestStepUp();
    if (mounted) {
      setState(() => _result = ScenarioProbe.stepUpText(verified: verified));
    }
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: ScenarioProbe._sensitiveTitle,
    body: Column(
      children: [
        Text(_result),
        TextButton(onPressed: _ask, child: const Text(ScenarioProbe.askStepUp)),
      ],
    ),
  );
}
