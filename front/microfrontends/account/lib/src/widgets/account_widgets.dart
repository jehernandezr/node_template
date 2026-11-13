import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../l10n/generated/account_localizations.dart';

/// Fila dentro de una [AppCard]: título, detalle opcional, insignia y acción.
class AccountRowCard extends StatelessWidget {
  const AccountRowCard({
    super.key,
    required this.title,
    this.subtitle,
    this.badge,
    this.trailing,
    this.onTap,
  });

  final String title;
  final String? subtitle;
  final Widget? badge;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final detail = subtitle;
    final badgeWidget = badge;
    final trailingWidget = trailing;
    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(title, style: theme.textTheme.titleMedium),
                    ),
                    if (badgeWidget != null) ...[
                      const SizedBox(width: AppSpacing.sm),
                      badgeWidget,
                    ],
                  ],
                ),
                if (detail != null) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(detail, style: muted),
                ],
              ],
            ),
          ),
          if (trailingWidget != null) ...[
            const SizedBox(width: AppSpacing.md),
            trailingWidget,
          ],
        ],
      ),
    );
  }
}

/// Insignia pequeña con texto, por ejemplo "Actual" o "Verificador".
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Chip(
      label: Text(
        label,
        style: TextStyle(color: scheme.onSecondaryContainer, fontSize: 12),
      ),
      backgroundColor: scheme.secondaryContainer,
      side: BorderSide.none,
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
    );
  }
}

/// Muestra un [AsyncValue] con [AsyncValueView]: cargando, error con
/// reintento o [data].
///
/// Un [ApiErrorException] muestra el mensaje de su código, junto con el código
/// y la traza para soporte. Cualquier otro error muestra el texto genérico.
class AccountAsyncView<T> extends StatelessWidget {
  const AccountAsyncView({
    super.key,
    required this.value,
    required this.onRetry,
    required this.data,
  });

  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final Widget Function(T value) data;

  @override
  Widget build(BuildContext context) {
    final shared = AppLocalizations.of(context);
    final current = value;
    final error = current is AsyncError<T> ? current.error : null;
    final message = error is ApiErrorException
        ? errorMessage(shared, error.problem.code)
        : AccountLocalizations.of(context).loadError;
    return AsyncValueView<T>(
      value: value,
      data: data,
      errorMessage: message,
      onRetry: onRetry,
      retryLabel: shared.actionRetry,
      codeLabel: shared.errorCodeLabel,
      traceIdLabel: shared.errorTraceIdLabel,
    );
  }
}

/// Ejecuta [action] y muestra el texto de [success] o el error de la acción.
/// Devuelve true cuando la acción se completó y el contexto sigue montado.
Future<bool> runAccountAction(
  BuildContext context,
  Future<void> Function() action, {
  required String Function() success,
}) async {
  final failed = AccountLocalizations.of(context).actionFailed;
  try {
    await action();
  } on Exception catch (error) {
    if (context.mounted) showActionError(context, error, message: failed);
    return false;
  }
  if (!context.mounted) return false;
  ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(success())));
  return true;
}
