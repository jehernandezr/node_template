---
name: front-accesibilidad
description: 'Accessibility of the Flutter front: Semantics, touch target sizes, contrast, text scale, focus and their tests. Use it on screens, widgets and ui.'
paths:
  - 'front/**/screens/**'
  - 'front/**/widgets/**'
  - 'front/packages/ui/**'
---

# Front accessibility

The target is WCAG 2.2 level AA on web, Android and iOS. The components in `front/packages/ui` already meet this list; a new or touched screen meets it in full.

## Rules

- **Actions:** never a bare `GestureDetector` as a button. Use `AppButton`, `FilledButton`, `TextButton`, `IconButton` or `InkWell`, which take focus and keyboard input. If a custom gesture is needed, wrap it in `Semantics(button: true, label: ..., onTap: ...)` and a `FocusableActionDetector`.
- **Accessible name:** an icon-only button has a `tooltip` (which also serves as its label) or `Semantics(label:)`. An informative `Image` has a `semanticLabel`; a decorative one, `excludeFromSemantics: true`. The text comes from the ARB.
- **Touch target size:** the theme sets a minimum height and width of 48 on buttons (`FilledButton` and `OutlinedButton`) and on fields (`InputDecorationTheme`), on web and mobile. A 24 icon is wrapped in an `IconButton` with `constraints` of 48; the icon is not enlarged.
- **Contrast:** 4.5:1 for text and 3:1 for large text and control borders. Colors come from `ColorScheme` or `context.statusColors` (see `front-layout-adaptable`); if a new pair is defined in `tokens`, check it with `textContrastGuideline` or by hand.
- **Color is not the only channel:** a state (error, done) also has an icon or text. A task state is shown with a label, not only with a color.
- **Text scale:** no fixed-height `SizedBox` or `Container` around `Text`; use `ConstrainedBox(minHeight:)`. Do not clamp `textScaler` except on a specific, justified element. The interface must survive 2x without overflow.
- **Focus and keyboard:** everything actionable is reachable with Tab and activated with Enter or Space. Focus order follows visual order. A dialog returns focus to whoever opened it. A text field declares `textInputAction` and, for personal data, `autofillHints`.
- **Dragging:** every drag gesture (`Dismissible`, reordering) has an equivalent button on the same screen.
- **Async changes:** `AsyncValueView` already announces loading and errors: `LoadingView` is a `Semantics` with `liveRegion` and its indicator carries the loading label, and `ErrorView` puts `liveRegion` on its message. A save or a one-off notice that does not go through those widgets is announced with `Semantics(liveRegion: true, child: ...)` or with `SemanticsService.sendAnnouncement`.
- **Motion:** a non-essential animation is skipped with `MediaQuery.disableAnimationsOf(context)`.
- **Groups:** `MergeSemantics` only for a static label and value pair. Never `ExcludeSemantics` over something actionable: it removes the control from the screen reader.
- **Headings:** the `AppPage` title goes in an `AppBar`, which already exposes it as a heading. A custom section title inside the body has `Semantics(header: true)`.
- **Forms:** every field has a `labelText` (not just `hintText`), and the validation error is tied to the field with `errorText` and is text, not only color.

## Example

Example in `references/ejemplos.md`, section "Example".

## Verification

- Every screen with actions calls `expectAccessible(tester)` from `test_utils`, which runs the Android and iOS touch target, label and contrast guidelines. Template in `front-pruebas/references/pruebas-de-widgets.md`.
- A test at 2x text scale with `pumpAtTextScale` and no exceptions.
- Manual review, once per new screen: Tab goes through everything; on web, turn on Flutter's accessibility reader and walk through; on mobile, TalkBack and VoiceOver.

## Audit report

Each finding has the criterion by name (`2.5.8 Target Size (Minimum)`), severity CRITICAL, MAJOR or MINOR, file, and the fix as Dart code before and after. A finding without fix code is not done. Anything that cannot be decided by reading the code (contrast without real colors, reader order) goes separately as "out of scope".

## With pstack

Method in `pstack-en-node-template`. The pstack skills that apply here: `principle-prove-it-works`, `principle-experience-first`, `interrogate`.
