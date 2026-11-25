# front-accesibilidad examples

Long examples the skill cites. Read them only when the topic applies.

## Example

```dart
IconButton(
  onPressed: onClose,
  tooltip: l10n.close,
  icon: const Icon(Icons.close),
  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
)

Semantics(
  liveRegion: true,
  child: Text(l10n.savedMessage),
)
```
