---
name: front-adaptive-layout
description: 'Adaptive layout and theme of the front: breakpoints, ContentColumn, AppPage, tokens and dark mode. Use it when building the presentation of a screen.'
paths:
  - 'front/packages/ui/**'
  - 'front/packages/tokens/**'
  - 'front/**/screens/**'
---

# Adaptive layout and theme

Web and mobile share screens, so the layout responds to the available space, not to the device.

## Layout

- The decision is made from the available width: `Breakpoint.of(context)` (compact below 600, medium up to 1024, expanded from 1024) or `LayoutBuilder` for a container's width. Do not ask for "phone" or "tablet", nor for the platform, nor use `OrientationBuilder` high up in the tree. <!-- id: front-adaptive-layout.1 -->
- A screen with different versions per width uses `PlatformScreen(compact:, medium:, expanded:)`. If a version is missing, it falls back to the smaller one. <!-- id: front-adaptive-layout.2 -->
- Reading content or a form does not stretch on wide screens: `ContentColumn` from `ui` (a `Center` with a `ConstrainedBox`, `maxWidth` defaulting to `AppLayout.readingWidth`). <!-- id: front-adaptive-layout.3 -->
- Each screen owns a single top bar through `AppPage` (ADR 0018). The shell draws the frame with `AdaptiveScaffold` and `ShellChrome`. <!-- id: front-adaptive-layout.4 -->
- A list that grows with the width becomes a `GridView` with `SliverGridDelegateWithMaxCrossAxisExtent`. <!-- id: front-adaptive-layout.5 -->
- `Expanded` and `Flexible` split the space of a `Row` or `Column`. A `Text` inside a `Row` goes in `Expanded` or `Flexible` so it does not overflow. <!-- id: front-adaptive-layout.6 -->
- A list of unknown length is `ListView.builder` or `ListView.separated`. A `Column` inside a `SingleChildScrollView` is only for short, fixed content. <!-- id: front-adaptive-layout.7 -->
- Orientation is not locked. Content respects `SafeArea` and the keyboard insets (`Scaffold` with `resizeToAvoidBottomInset`). <!-- id: front-adaptive-layout.8 -->
- Multiple input types: everything actionable works with touch, mouse and keyboard (see `front-accessibility`); at `expanded` width, shortcuts are added only when they help. <!-- id: front-adaptive-layout.9 -->
- An overflow is not covered with `SingleChildScrollView` nor hidden in tests: fix the constraint. A per-width test guards it (see `front-testing`). <!-- id: front-adaptive-layout.10 -->

## Theme and tokens

- The only source of color, typography, spacing and radii is `front/packages/tokens` (`AppSpacing`, `AppRadius`, `AppIconSize`, `AppLayout`, `AppTypeScale`, `AppColors`) through `AppTheme` from `ui`. <!-- id: front-adaptive-layout.11 -->
- In a widget: `Theme.of(context).colorScheme` and `Theme.of(context).textTheme`. Never `Colors.red`, `Color(0xFF...)`, `TextStyle(fontSize: ...)` or loose padding numbers. A space is `AppSpacing.md`, a radius `AppRadius.md`. <!-- id: front-adaptive-layout.12 -->
- Success, warning and info states come from `context.statusColors`, the extension that reads `StatusColors` (a `ThemeExtension` from `ui` that `AppTheme` registers). Its roles are `success`, `warning` and `info`, each with `onX` for content and `xContainer` and `onXContainer` for the soft background. <!-- id: front-adaptive-layout.13 -->
- `copyWith` on a theme style only changes a color role, not size or weight. <!-- id: front-adaptive-layout.14 -->
- Repeated styles go into the theme (`FilledButtonThemeData`, `OutlinedButtonThemeData` and `InputDecorationThemeData` in `AppTheme`), not into a wrapper or a decoration constant that every call has to remember to use. <!-- id: front-adaptive-layout.15 -->
- Light and dark come from `AppTheme.light()` and `AppTheme.dark()`. No widget asks for `Brightness` or does `isDark ? a : b`: if a color is missing, add a role to the `ColorScheme` or to `StatusColors`. <!-- id: front-adaptive-layout.16 -->
- For margins and alignment use `EdgeInsetsDirectional` and `AlignmentDirectional` (see `front-i18n`), and `EdgeInsets.only` or `.symmetric` instead of `fromLTRB`. <!-- id: front-adaptive-layout.17 -->
- A new design value is added first to `design-tokens.json` and to `tokens`, not to the widget that needs it. <!-- id: front-adaptive-layout.18 -->

## Example

Example in `references/examples.md`, section "Example".

A test of a widget at several widths (illustrative example, the `TaskSummaryCard` widget does not exist in the code) uses `pumpAtWidths` from `test_utils`, which renders the screen at 320, 800 and 1280 by default and calls `check` at each one:

```dart
await pumpAtWidths(
  tester,
  TestApp().wrap(const TaskSummaryCard(task: _task)),
  check: (width) async => expect(tester.takeException(), isNull),
);
```

## With pstack

Method in `pstack-in-node-template`. The pstack skills that apply here: `principle-experience-first`, `principle-prove-it-works`, `visual-parity`, `poteto-mode`.
