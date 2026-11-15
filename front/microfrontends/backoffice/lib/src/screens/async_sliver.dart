import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../l10n/generated/backoffice_localizations.dart';

/// Sliver for an [AsyncValue]: a loading or error view while there is no data
/// (the error view offers [onRetry]) and the slivers of [data] once there is.
class AsyncSliver<T> extends StatelessWidget {
  const AsyncSliver({
    super.key,
    required this.value,
    required this.data,
    this.onRetry,
  });

  final AsyncValue<T> value;

  /// Slivers shown for the loaded value.
  final List<Widget> Function(T value) data;

  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => switch (value) {
    AsyncData<T>(value: final loaded) => SliverMainAxisGroup(
      slivers: data(loaded),
    ),
    AsyncLoading<T>() || AsyncError<T>() => SliverToBoxAdapter(
      child: AsyncValueView<T>(
        value: value,
        errorMessage: BackofficeLocalizations.of(context).loadError,
        onRetry: onRetry,
        data: (_) => const SizedBox.shrink(),
      ),
    ),
  };
}
