# ui

Shared Flutter widgets for the web and mobile shells and every microfrontend.
Depends on Flutter, `tokens` and `i18n` (shared texts such as the error
labels, and `ErrorPresenter`).

## Theme

- `AppTheme.light()` and `AppTheme.dark()` return Material 3 `ThemeData`
  built from `AppColors` and `AppTypeScale`. Both register `StatusColors`
  and set a 48 logical pixel minimum height on filled and outlined buttons
  and on text fields.

## Layout

- `Breakpoint` (`compact` < 600, `medium` < 1024, `expanded`):
  `Breakpoint.of(context)` or `Breakpoint.fromWidth(width)`.
- `AdaptiveScaffold(destinations, selectedIndex, onSelected, body, appBar?)`:
  bottom `NavigationBar` on compact, `NavigationRail` on medium and expanded.
  Destinations are `AdaptiveDestination(label, icon, selectedIcon?)`.
- `PlatformScreen(compact, medium?, expanded?)`: picks a builder by breakpoint,
  falling back to the next smaller one.
- `ContentColumn(child, maxWidth?)`: centers the content and limits its width.
  `maxWidth` defaults to `AppLayout.readingWidth`.

## Components

- `AppButton(label, onPressed, variant: AppButtonVariant.primary | secondary | danger, loading)`
- `AppCard(child, padding?, onTap?)`
- `EmptyState(icon, title, message?, actionLabel?, onAction?)`
- `ErrorView(message, code?, traceId?, onRetry?)`: shows the error code and
  trace id as selectable text. Its labels come from `AppLocalizations`.
- `ErrorView.details(details, onRetry?)`: the same view, built from the
  `ErrorDetails` of an `ErrorPresenter`.
- `ErrorView.fromException(error, fallbackMessage, onRetry?)`: the code and
  trace id of an API error, with the text always set to `fallbackMessage`.
- `AsyncValueView(value, data, errorMessage, onRetry?)`: loading, error and
  data of an `AsyncValue`.
- `showActionError(context, error, message?)` and
  `actionErrorMessage(l10n, error)`: the snack bar and the localized text of
  a failed user action.
- `LoadingView(message?)`: a spinner labeled with the shared loading text.
- `MetaLine(parts, style?)`: joins the parts with the localized separator.

The app must provide `AppLocalizations` from `i18n`.

## Context

- `context.localeTag`: the BCP 47 tag of the locale in use.
- `context.statusColors`: the `StatusColors` of the current theme.

## State

- `AsyncValue`: loading, data or error. `guard` runs a load and `when` folds it.
- `AsyncLoader`: loads an `AsyncValue` and ignores a stale response.
- `ActionRunner`: runs a user action and returns an `ActionResult`, with an
  `ActionConcurrency` mode.
- `ControllerBuilder`: creates a controller once, rebuilds on change and
  disposes it.
- `showActionResult(context, result, success?, failure?)`: shows the outcome
  of an `ActionResult` in a snack bar.
