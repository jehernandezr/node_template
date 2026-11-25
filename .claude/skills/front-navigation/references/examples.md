# front-navigation examples

Long examples the skill cites. Read them only when the topic applies to you.

## Example

```dart
Future<void> _save() async {
  final result = await widget.controller.save();
  if (!mounted) return;
  if (result is ActionSucceeded<String>) {
    context.go(TasksPaths.detail(result.value));
    return;
  }
  showActionResult(context, result);
}
```
