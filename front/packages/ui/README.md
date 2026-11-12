# ui

Shared Flutter widgets for the web and mobile shells and every microfrontend.
Depends only on Flutter and `tokens`.

## Theme

- `AppTheme.light()` and `AppTheme.dark()` return Material 3 `ThemeData`
  built from `AppColors` and `AppTypeScale`.

## Layout

- `Breakpoint` (`compact` < 600, `medium` < 1024, `expanded`):
  `Breakpoint.of(context)` or `Breakpoint.fromWidth(width)`.
- `AdaptiveScaffold(destinations, selectedIndex, onSelected, body, appBar?)`:
  bottom `NavigationBar` on compact, `NavigationRail` on medium and expanded.
  Destinations are `AdaptiveDestination(label, icon, selectedIcon?)`.
- `PlatformScreen(compact, medium?, expanded?)`: picks a builder by breakpoint,
  falling back to the next smaller one.

## Components

- `AppButton(label, onPressed, variant: AppButtonVariant.primary | secondary | danger, loading)`
- `AppCard(child, padding?, onTap?)`
- `EmptyState(icon, title, message?, actionLabel?, onAction?)`
- `ErrorView(message, code?, traceId?, onRetry?, retryLabel?)`: shows the
  error code and trace id as selectable text.
- `LoadingView(message?)`

Labels default to English (`Retry`). Pass localized text from the caller.
