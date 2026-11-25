# front-layout-adaptable examples

Long examples the skill cites. Read them only when the topic applies.

## Example

```dart
Widget build(BuildContext context) {
  final theme = Theme.of(context);
  return ContentColumn(
    child: Padding(
      padding: const EdgeInsetsDirectional.all(AppSpacing.md),
      child: Row(
        children: [
          Icon(Icons.check_circle, color: context.statusColors.success),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                color: theme.colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
```
