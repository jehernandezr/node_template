import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

/// Centered spinner with an optional [message] below it.
class LoadingView extends StatelessWidget {
  /// Creates a loading view.
  const LoadingView({super.key, this.message});

  /// Text shown under the spinner.
  final String? message;

  @override
  Widget build(BuildContext context) {
    final text = message;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (text != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(text, textAlign: TextAlign.center),
          ],
        ],
      ),
    );
  }
}
