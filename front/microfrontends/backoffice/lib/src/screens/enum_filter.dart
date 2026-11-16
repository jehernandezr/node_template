import 'package:material_ui/material_ui.dart';

/// Labeled dropdown that filters a list by one value of the enum [T], or by
/// none. The label names the filter for screen readers even after a value is
/// chosen.
class EnumFilter<T extends Enum> extends StatelessWidget {
  const EnumFilter({
    super.key,
    required this.label,
    required this.allLabel,
    required this.values,
    required this.valueLabel,
    required this.value,
    required this.onChanged,
  });

  /// Widest a filter grows, so on a wide screen it does not span the page.
  static const double maxWidth = 280;

  /// Name of the filter.
  final String label;

  /// Text of the option that removes the filter.
  final String allLabel;

  /// Options, in display order.
  final List<T> values;

  /// Localized text of one option.
  final String Function(T value) valueLabel;

  /// Selected option, or null for all.
  final T? value;

  /// Called with the new option, or null for all.
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: maxWidth),
    child: DropdownButtonFormField<T?>(
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(labelText: label),
      items: [
        DropdownMenuItem<T?>(value: null, child: Text(allLabel)),
        for (final option in values)
          DropdownMenuItem<T?>(value: option, child: Text(valueLabel(option))),
      ],
      onChanged: onChanged,
    ),
  );
}
