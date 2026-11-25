---
name: front-layout-adaptable
description: 'Adaptive layout and theme of the front: breakpoints, ContentColumn, AppPage, tokens and dark mode. Use it when building the presentation of a screen.'
paths:
  - 'front/packages/ui/**'
  - 'front/packages/tokens/**'
  - 'front/**/screens/**'
---

# Adaptive layout and theme

Web and mobile share screens, so the layout responds to the available space, not to the device.

## Layout

- The decision is made from the available width: `Breakpoint.of(context)` (compact below 600, medium up to 1024, expanded from 1024) or `LayoutBuilder` for a container's width. Do not ask for "phone" or "tablet", nor for the platform, nor use `OrientationBuilder` high up in the tree.
- A screen with different versions per width uses `PlatformScreen(compact:, medium:, expanded:)`. If a version is missing, it falls back to the smaller one.
- Reading content or a form does not stretch on wide screens: `ContentColumn` from `ui` (a `Center` with a `ConstrainedBox`, `maxWidth` defaulting to `AppLayout.readingWidth`).
- Each screen owns a single top bar through `AppPage` (ADR 0018). The shell draws the frame with `AdaptiveScaffold` and `ShellChrome`.
- A list that grows with the width becomes a `GridView` with `SliverGridDelegateWithMaxCrossAxisExtent`.
- `Expanded` and `Flexible` split the space of a `Row` or `Column`. A `Text` inside a `Row` goes in `Expanded` or `Flexible` so it does not overflow.
- A list of unknown length is `ListView.builder` or `ListView.separated`. A `Column` inside a `SingleChildScrollView` is only for short, fixed content.
- Orientation is not locked. Content respects `SafeArea` and the keyboard insets (`Scaffold` with `resizeToAvoidBottomInset`).
- Multiple input types: everything actionable works with touch, mouse and keyboard (see `front-accesibilidad`); at `expanded` width, shortcuts are added only when they help.
- An overflow is not covered with `SingleChildScrollView` nor hidden in tests: fix the constraint. A per-width test guards it (see `front-pruebas`).

## Theme and tokens

- The only source of color, typography, spacing and radii is `front/packages/tokens` (`AppSpacing`, `AppRadius`, `AppIconSize`, `AppLayout`, `AppTypeScale`, `AppColors`) through `AppTheme` from `ui`.
- In a widget: `Theme.of(context).colorScheme` and `Theme.of(context).textTheme`. Never `Colors.red`, `Color(0xFF...)`, `TextStyle(fontSize: ...)` or loose padding numbers. A space is `AppSpacing.md`, a radius `AppRadius.md`.
- Success, warning and info states come from `context.statusColors`, the extension that reads `StatusColors` (a `ThemeExtension` from `ui` that `AppTheme` registers). Its roles are `success`, `warning` and `info`, each with `onX` for content and `xContainer` and `onXContainer` for the soft background.
- `copyWith` on a theme style only changes a color role, not size or weight.
- Repeated styles go into the theme (`FilledButtonThemeData`, `OutlinedButtonThemeData` and `InputDecorationThemeData` in `AppTheme`), not into a wrapper or a decoration constant that every call has to remember to use.
- Light and dark come from `AppTheme.light()` and `AppTheme.dark()`. No widget asks for `Brightness` or does `isDark ? a : b`: if a color is missing, add a role to the `ColorScheme` or to `StatusColors`.
- For margins and alignment use `EdgeInsetsDirectional` and `AlignmentDirectional` (see `front-i18n`), and `EdgeInsets.only` or `.symmetric` instead of `fromLTRB`.
- A new design value is added first to `design-tokens.json` and to `tokens`, not to the widget that needs it.

## Example

Example in `references/ejemplos.md`, section "Example".

A test of a widget at several widths (illustrative example, the `TaskSummaryCard` widget does not exist in the code) uses `pumpAtWidths` from `test_utils`, which renders the screen at 320, 800 and 1280 by default and calls `check` at each one:

```dart
await pumpAtWidths(
  tester,
  TestApp().wrap(const TaskSummaryCard(task: _task)),
  check: (width) async => expect(tester.takeException(), isNull),
);
```

## With pstack

Method in `pstack-en-node-template`. The pstack skills that apply here: `principle-experience-first`, `principle-prove-it-works`, `visual-parity`, `poteto-mode`.
