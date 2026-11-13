import 'package:material_ui/material_ui.dart';

import 'shell_chrome.dart';

/// Page of a screen with its single top bar.
///
/// Each screen owns the only top bar: title, its own [actions] and the back
/// button. The shell does not draw another one (see [ShellChrome]); when the
/// shell has actions that the page must show, such as sign-out on compact
/// widths, they are appended after [actions].
///
/// The back button appears when the route can be popped, or always when
/// [onBack] is set (for example `() => context.go('/tasks')` on a detail page
/// opened by deep link).
class AppPage extends StatelessWidget {
  /// Creates a page titled [title] showing [body].
  const AppPage({
    super.key,
    required this.title,
    required this.body,
    this.actions = const [],
    this.onBack,
    this.floatingActionButton,
    this.bottom,
  });

  /// Title of the top bar.
  final String title;

  /// Content of the page.
  final Widget body;

  /// Actions of the screen, shown before the shell's actions.
  final List<Widget> actions;

  /// Called by the back button. When null, the button pops the route and is
  /// shown only when the route can be popped.
  final VoidCallback? onBack;

  /// Optional floating action button.
  final Widget? floatingActionButton;

  /// Optional widget under the top bar, such as a [TabBar].
  final PreferredSizeWidget? bottom;

  @override
  Widget build(BuildContext context) {
    final back = onBack;
    final shellActions = ShellChrome.pageActionsOf(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: back == null ? null : BackButton(onPressed: back),
        automaticallyImplyLeading: back == null,
        actions: [...actions, ...shellActions],
        bottom: bottom,
      ),
      body: body,
      floatingActionButton: floatingActionButton,
    );
  }
}
