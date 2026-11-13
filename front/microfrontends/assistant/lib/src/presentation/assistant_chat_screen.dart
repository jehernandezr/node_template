import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/assistant_models.dart';
import '../data/assistant_repository.dart';
import '../l10n/generated/assistant_localizations.dart';
import 'assistant_chat_controller.dart';

/// Chat with streaming answers, citations, tool confirmations and errors.
class AssistantChatScreen extends StatefulWidget {
  const AssistantChatScreen({
    super.key,
    required this.conversationId,
    required this.repository,
  });

  final String conversationId;
  final AssistantRepository repository;

  @override
  State<AssistantChatScreen> createState() => _AssistantChatScreenState();
}

class _AssistantChatScreenState extends State<AssistantChatScreen> {
  late final AssistantChatController _controller;
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _controller = AssistantChatController(
      repository: widget.repository,
      conversationId: widget.conversationId,
    )..addListener(_scrollToEnd);
    _controller.load();
  }

  @override
  void dispose() {
    _controller.dispose();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _scroll.hasClients) {
        _scroll.jumpTo(_scroll.position.maxScrollExtent);
      }
    });
  }

  void _send() {
    if (_controller.isStreaming) return;
    final text = _input.text;
    _input.clear();
    _controller.send(text);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.chatTitle)),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _controller,
          builder: (context, _) {
            if (_controller.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }
            return Column(
              children: [
                Expanded(child: _buildMessages()),
                _buildComposer(),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildMessages() {
    final l10n = AssistantLocalizations.of(context);
    final messages = _controller.messages;
    final error = _controller.error;
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: messages.length + (error == null ? 0 : 1),
      itemBuilder: (context, index) {
        if (index < messages.length) {
          return _MessageBubble(
            message: messages[index],
            controller: _controller,
          );
        }
        return ErrorView.fromException(
          error!,
          fallbackMessage: _errorMessage(l10n, error),
          codeLabel: AppLocalizations.of(context).errorCodeLabel,
          traceIdLabel: AppLocalizations.of(context).errorTraceIdLabel,
          retryLabel: AppLocalizations.of(context).actionRetry,
        );
      },
    );
  }

  Widget _buildComposer() {
    final l10n = AssistantLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _input,
              minLines: 1,
              maxLines: 4,
              onSubmitted: (_) => _send(),
              decoration: InputDecoration(hintText: l10n.inputHint),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          if (_controller.isStreaming)
            FilledButton(onPressed: _controller.stop, child: Text(l10n.stop))
          else
            FilledButton(onPressed: _send, child: Text(l10n.send)),
        ],
      ),
    );
  }

  /// Quota errors get their own sentence; any other failure gets the generic one.
  String _errorMessage(AssistantLocalizations l10n, Object error) {
    final isQuota =
        error is ApiErrorException &&
        error.problem.code == 'BILLING.QUOTA.EXCEEDED';
    return isQuota ? l10n.quotaExceeded : l10n.genericError;
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.controller});

  final ChatMessage message;
  final AssistantChatController controller;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (message.role == AssistantRole.user) {
      return Align(
        alignment: AlignmentDirectional.centerEnd,
        child: Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.sm + 4),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md - 2,
            vertical: AppSpacing.sm + 2,
          ),
          decoration: BoxDecoration(
            color: scheme.primaryContainer,
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Text(
            message.text,
            style: TextStyle(color: scheme.onPrimaryContainer),
          ),
        ),
      );
    }
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Card(
          margin: const EdgeInsets.only(bottom: AppSpacing.sm + 4),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.sm + 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: _assistantContent(context),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _assistantContent(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    final theme = Theme.of(context);
    final small = theme.textTheme.labelSmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final parts = <Widget>[];

    if (message.text.isNotEmpty) {
      parts.add(Text(message.text));
    } else if (message.isStreaming) {
      parts.add(Text(l10n.streaming, style: small));
    }
    if (message.wasStopped) {
      parts.add(_gap(Text(l10n.stopped, style: small)));
    }

    final request = message.toolRequest;
    if (request != null) {
      parts.add(
        _gap(
          _ToolConfirmationCard(
            request: request,
            approved: message.toolApproved,
            onConfirm: () =>
                controller.respondToTool(messageId: message.id, approved: true),
            onReject: () => controller.respondToTool(
              messageId: message.id,
              approved: false,
            ),
          ),
        ),
      );
    }

    if (message.citations.isNotEmpty) {
      parts.add(_gap(_Citations(citations: message.citations)));
    }

    final usage = message.usage;
    if (usage != null && !message.isStreaming) {
      parts.add(
        _gap(Text(l10n.usage(usage.input, usage.output), style: small)),
      );
    }
    return parts;
  }

  Widget _gap(Widget child) => Padding(
    padding: const EdgeInsets.only(top: AppSpacing.sm),
    child: child,
  );
}

class _ToolConfirmationCard extends StatelessWidget {
  const _ToolConfirmationCard({
    required this.request,
    required this.approved,
    required this.onConfirm,
    required this.onReject,
  });

  final ToolConfirmationRequest request;
  final bool? approved;
  final VoidCallback onConfirm;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    final theme = Theme.of(context);
    final answer = approved;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outline),
        borderRadius: BorderRadius.circular(AppRadius.lg - 4),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm + 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(l10n.toolRequestTitle, style: theme.textTheme.titleSmall),
            const SizedBox(height: AppSpacing.xs),
            Text(request.summary),
            const SizedBox(height: AppSpacing.xs),
            Text(
              request.toolName,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            if (answer == null)
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: onReject,
                    child: Text(l10n.toolCancel),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  FilledButton(
                    onPressed: onConfirm,
                    child: Text(l10n.toolConfirm),
                  ),
                ],
              )
            else
              Text(
                answer ? l10n.toolConfirmed : l10n.toolRejected,
                style: theme.textTheme.labelLarge,
              ),
          ],
        ),
      ),
    );
  }
}

class _Citations extends StatelessWidget {
  const _Citations({required this.citations});

  final List<Citation> citations;

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(l10n.sources, style: theme.textTheme.labelMedium),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final citation in citations)
              Tooltip(
                message: citation.sourceId,
                child: Chip(
                  avatar: const Icon(Icons.description_outlined, size: 16),
                  label: Text(citation.title),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
