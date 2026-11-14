import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';

/// Carries the delegates of a [DeferredLocalizations] down the tree, so the
/// overlay helpers can find them from the context of a button.
final class _DeferredLocalizationsScope extends InheritedWidget {
  const _DeferredLocalizationsScope({
    required this.delegates,
    required super.child,
  });

  final List<LocalizationsDelegate<Object?>> delegates;

  @override
  bool updateShouldNotify(_DeferredLocalizationsScope oldWidget) =>
      !listEquals(delegates, oldWidget.delegates);
}

/// Installs [delegates] for [child] and remembers them so dialogs and sheets
/// can reapply them (see [LocalizedOverlays]).
final class DeferredLocalizations extends StatelessWidget {
  /// Creates the widget.
  const DeferredLocalizations({
    super.key,
    required this.delegates,
    required this.child,
  });

  /// Delegates of the deferred library, loaded before the page builds.
  final List<LocalizationsDelegate<Object?>> delegates;

  /// The page.
  final Widget child;

  @override
  Widget build(BuildContext context) => _DeferredLocalizationsScope(
    delegates: delegates,
    child: Localizations.override(
      context: context,
      delegates: delegates,
      child: child,
    ),
  );
}

/// Dialogs and sheets are routes of the navigator, siblings of the page, so
/// they do not inherit the page's localizations. These reapply the delegates
/// of the nearest [DeferredLocalizations].
extension LocalizedOverlays on BuildContext {
  /// Like `showDialog`, with the delegates of the nearest
  /// [DeferredLocalizations]. Throws [FlutterError] when there is none.
  Future<T?> showLocalizedDialog<T>({
    required WidgetBuilder builder,
    bool barrierDismissible = true,
  }) {
    final delegates = _requireDelegates();
    return showDialog<T>(
      context: this,
      barrierDismissible: barrierDismissible,
      builder: (dialogContext) => Localizations.override(
        context: dialogContext,
        delegates: delegates,
        child: Builder(builder: builder),
      ),
    );
  }

  /// Like `showModalBottomSheet`, with the delegates of the nearest
  /// [DeferredLocalizations]. Throws [FlutterError] when there is none.
  Future<T?> showLocalizedSheet<T>({
    required WidgetBuilder builder,
    bool isScrollControlled = false,
  }) {
    final delegates = _requireDelegates();
    return showModalBottomSheet<T>(
      context: this,
      isScrollControlled: isScrollControlled,
      builder: (sheetContext) => Localizations.override(
        context: sheetContext,
        delegates: delegates,
        child: Builder(builder: builder),
      ),
    );
  }

  List<LocalizationsDelegate<Object?>> _requireDelegates() {
    final scope = getInheritedWidgetOfExactType<_DeferredLocalizationsScope>();
    if (scope == null) {
      throw FlutterError(
        'No DeferredLocalizations above this context.\n'
        'Wrap the page in DeferredLocalizations(delegates: ..., child: ...) '
        'before opening dialogs or sheets with showLocalizedDialog or '
        'showLocalizedSheet.',
      );
    }
    return scope.delegates;
  }
}
