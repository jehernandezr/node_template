import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import 'web_shell.dart';

/// Root widget of the web shell. Starts the [WebShell] runtime and disposes it.
class WebShellApp extends StatefulWidget {
  const WebShellApp({super.key, required this.shell});

  final WebShell shell;

  @override
  State<WebShellApp> createState() => _WebShellAppState();
}

class _WebShellAppState extends State<WebShellApp> {
  @override
  void initState() {
    super.initState();
    widget.shell.start();
  }

  @override
  void dispose() {
    widget.shell.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      localizationsDelegates: [
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
      supportedLocales: supportedLocales,
      routerConfig: widget.shell.router,
    );
  }
}
