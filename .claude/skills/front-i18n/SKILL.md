---
name: front-i18n
description: 'Internationalization of the front: ARB, gen-l10n, plurals and error texts. Use it when adding or changing a visible text.'
paths:
  - 'front/**/*.arb'
  - 'front/**/l10n/**'
  - 'front/packages/i18n/**'
---

# Internationalization

## Where each text lives

- **Shared texts** (actions, catalog errors, `ui` labels): `front/packages/i18n/lib/l10n/app_es.arb` and `app_en.arb`, class `AppLocalizations`.
- **A microfrontend's texts:** `lib/src/l10n/app_es.arb` and `app_en.arb`, with their own class (`TasksLocalizations`). They hang from `l10n/` inside the deferred chunk, so a client does not download the texts of a microfrontend it does not use.
- **Menu label:** `MenuLabel({'es': ..., 'en': ...})` in the manifest, because the shell draws it before loading the microfrontend. It is the only exception.
- The template is `app_es.arb`; every key exists in all supported languages.

## Rules

- No visible text in a Dart literal: not `Text('Guardar')`, not `tooltip`, not `semanticLabel`, not error messages. Everything comes from localization: `TasksLocalizations.of(context).save`.
- A shared `ui` widget does not read `AppLocalizations` if it receives the text as a parameter; those that do read it (`ErrorView`, `showActionError`) say so in their documentation and require the delegate.
- A server text is never shown. Map the contract code: `ErrorPresenter(l10n).describe(error)` for an error's message and code, `actionMessage(error)` for an action's text. Both come from `i18n`, and `errorMessage(l10n, code)` from `i18n` gives the text for a code.
- An enum's text comes from a function with an exhaustive `switch` (`taskStatusLabel(l10n, status)`), so a new case breaks compilation until it has its text.
- Plurals, gender and numbers go in the ARB with ICU syntax, not with `if (count == 1)` in Dart:

```json
"messagesCount": "{count, plural, =0{Sin mensajes} =1{1 mensaje} other{{count} mensajes}}",
"@messagesCount": { "placeholders": { "count": { "type": "int" } } }
```

- Dates, times and money: `DateFormat` and `NumberFormat` from `intl` with the context locale, or the helpers in `front/packages/utils` (`dates`, `money`, `numbers`). Never concatenate parts by hand.
- Do not concatenate sentences or join them with separators (`·`): `'${l10n.hello} $name'` breaks in other languages. Use a placeholder: `"hello": "Hola, {name}"`, and the separator goes inside the ARB sentence.
- Directionality: `EdgeInsetsDirectional`, `AlignmentDirectional` and `start`/`end` instead of `left`/`right`, so a right-to-left language works without rewriting.
- No third-party i18n libraries. Flutter and `intl` are enough.

## Dialogs and sheets

A dialog or a sheet is a `Navigator` route, a sibling of the page, so it does not inherit the localizations the screen loads deferred. The screen wraps its content in `DeferredLocalizations` (from `shell_core`) and opens dialogs with `showLocalizedDialog` or `showLocalizedSheet`, which are `BuildContext` extensions and reapply the same delegates:

Illustrative example, the `deleteTitle` key does not exist in the code:

```dart
final confirmed = await context.showLocalizedDialog<bool>(
  builder: (context) => AlertDialog(
    title: Text(TasksLocalizations.of(context).deleteTitle),
  ),
);
```

If there is no `DeferredLocalizations` above, the helper throws a `FlutterError` that says what is missing.

## Adding a text

1. Write the key in `app_es.arb` (with `@key` and placeholders if it has any) and in `app_en.arb`.
2. Regenerate: `flutter gen-l10n` from the package or microfrontend folder. The output in `l10n/generated` is versioned and not edited by hand.
3. Use the key in the widget and add or adjust the test that looks for the text.

## Testing

Tests look for text through localization or by the Spanish literal, with `TestApp` from `test_utils` (`TestApp(delegates: const [TasksLocalizations.delegate])`), which installs the shared delegates and the microfrontend's. A test for each supported language checks that every key resolves (`supportedLocales` from `i18n`).

## With pstack

Method in `pstack-en-node-template`. The pstack skills that apply here: `unslop`, `technical-writing`.
