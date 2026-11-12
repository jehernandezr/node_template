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

/// Carga [future] y muestra cargando, error con reintento o [builder] con el dato.
class AsyncView<T> extends StatelessWidget {
  const AsyncView({
    super.key,
    required this.future,
    required this.onRetry,
    required this.builder,
  });

  final Future<T> future;
  final VoidCallback onRetry;
  final Widget Function(BuildContext context, T data) builder;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snapshot) {
        final error = snapshot.error;
        if (error != null) {
          return accountErrorView(context, error, onRetry);
        }
        if (!snapshot.hasData) {
          return LoadingView(message: AppLocalizations.of(context).loading);
        }
        return builder(context, snapshot.requireData);
      },
    );
  }
}

/// Vista de error de la cuenta.
///
/// Un [ApiErrorException] muestra el mensaje de su código y el código y la
/// traza para soporte. Cualquier otro error muestra el texto genérico.
Widget accountErrorView(
  BuildContext context,
  Object error,
  VoidCallback onRetry,
) {
  final l10n = AppLocalizations.of(context);
  if (error is ApiErrorException) {
    return ErrorView.fromProblem(
      error.problem,
      message: errorMessage(l10n, error.problem.code),
      onRetry: onRetry,
      codeLabel: l10n.errorCodeLabel,
      traceIdLabel: l10n.errorTraceIdLabel,
      retryLabel: l10n.actionRetry,
    );
  }
  return ErrorView(
    message: AccountLocalizations.of(context).loadError,
    onRetry: onRetry,
    codeLabel: l10n.errorCodeLabel,
    traceIdLabel: l10n.errorTraceIdLabel,
    retryLabel: l10n.actionRetry,
  );
}

/// Ejecuta [action] y muestra [success] o un mensaje de error.
/// Devuelve true cuando la acción se completó.
Future<bool> runAccountAction(
  BuildContext context,
  Future<void> Function() action, {
  required String success,
}) async {
  final messenger = ScaffoldMessenger.of(context);
  final failed = AccountLocalizations.of(context).actionFailed;
  try {
    await action();
    messenger.showSnackBar(SnackBar(content: Text(success)));
    return true;
  } catch (_) {
    messenger.showSnackBar(SnackBar(content: Text(failed)));
    return false;
  }
}
