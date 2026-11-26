import 'dart:async';

import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'shell_host.dart';

/// Root widget of a shell: starts [host] when mounted and disposes it when
/// removed.
class ShellHostApp extends StatefulWidget {
  /// App widget of [host].
  const ShellHostApp({super.key, required this.host});

  /// Host whose router and theme the app uses.
  final ShellHost host;

  @override
  State<ShellHostApp> createState() => _ShellHostAppState();
}

class _ShellHostAppState extends State<ShellHostApp> {
  @override
  void initState() {
    super.initState();
    unawaited(widget.host.start());
  }

  @override
  void dispose() {
    unawaited(widget.host.dispose());
    super.dispose();
  }

  /// Lets the shell frame use AccessGate and context.can as well.
  @override
  Widget build(BuildContext context) {
    final host = widget.host;
    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      localizationsDelegates: [
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
      supportedLocales: supportedLocales,
      routerConfig: host.router,
      scaffoldMessengerKey: host.scaffoldMessengerKey,
      builder: (context, child) => ShellAccessScope(
        session: host.session,
        clock: host.runtime.clock,
        paths: ShellHost.paths,
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
