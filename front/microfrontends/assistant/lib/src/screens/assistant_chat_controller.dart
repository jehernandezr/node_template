import 'dart:async';

import 'package:flutter/foundation.dart';

import 'package:ui/ui.dart';

import '../data/assistant_repository.dart';
import '../shared/enums/assistant_role.dart';
import '../shared/types/assistant_types.dart';

/// Holds the messages of one conversation and the state of the current answer.
final class AssistantChatController extends ChangeNotifier {
  AssistantChatController({
    required this.repository,
    required this.conversationId,
  });

  final AssistantRepository repository;
  final String conversationId;

  List<ChatMessage> _messages = const [];
  AsyncValue<List<ChatMessage>> _loadState = const AsyncValue.loading();
  Object? _error;
  StreamSubscription<AssistantChunk>? _subscription;
  String? _streamingId;
  int _sequence = 0;
  bool _disposed = false;

  List<ChatMessage> get messages => _messages;
  bool get isStreaming => _subscription != null;

  /// State of the initial load of the conversation.
  AsyncValue<List<ChatMessage>> get loadState => _loadState;

  /// Error of the last answer: an `ApiErrorException` or any other object.
  Object? get error => _error;

  /// Loads the history. Ignored result if the controller was disposed meanwhile.
  Future<void> load() async {
    _loadState = const AsyncValue.loading();
    _notify();
    final result = await AsyncValue.guard(
      () => repository.loadMessages(conversationId),
    );
    if (_disposed) return;
    _loadState = result;
    _messages = result.valueOrNull ?? _messages;
    _notify();
  }

  /// Adds the user message and starts the answer. Ignored while streaming.
  void send(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty || isStreaming) return;

    final assistantId = _nextId();
    _error = null;
    _streamingId = assistantId;
    _messages = [
      ..._messages,
      ChatMessage(id: _nextId(), role: AssistantRole.user, text: trimmed),
      ChatMessage(
        id: assistantId,
        role: AssistantRole.assistant,
        isStreaming: true,
      ),
    ];
    _subscription = repository
        .ask(conversationId, trimmed)
        .listen(
          (chunk) => _onChunk(assistantId, chunk),
          onError: (Object error) => _fail(assistantId, error),
          onDone: () => _finish(assistantId),
          cancelOnError: true,
        );
    _notify();
  }

  /// Cancels the answer in progress and keeps the text received so far.
  void stop() {
    final subscription = _subscription;
    final id = _streamingId;
    if (subscription == null || id == null) return;

    final pending = _messages
        .where((message) => message.id == id)
        .firstOrNull
        ?.toolRequest;
    final hasPending = pending != null && !pending.isResolved;
    if (hasPending) pending.reject();

    _subscription = null;
    _streamingId = null;
    subscription.cancel();
    _update(
      id,
      (message) => message.copyWith(
        isStreaming: false,
        wasStopped: true,
        toolApproved: hasPending ? false : null,
      ),
    );
  }

  /// Answers a tool confirmation shown in [messageId].
  void respondToTool({required String messageId, required bool approved}) {
    final request = _messages
        .where((message) => message.id == messageId)
        .firstOrNull
        ?.toolRequest;
    if (request == null || request.isResolved) return;

    if (approved) {
      request.confirm();
    } else {
      request.reject();
    }
    _update(messageId, (message) => message.copyWith(toolApproved: approved));
  }

  void _onChunk(String assistantId, AssistantChunk chunk) {
    switch (chunk) {
      case AssistantTextChunk(:final text):
        _update(
          assistantId,
          (message) => message.copyWith(text: message.text + text),
        );
      case AssistantFinalChunk(:final citations, :final usage):
        _update(
          assistantId,
          (message) => message.copyWith(citations: citations, usage: usage),
        );
      case ToolConfirmationRequest():
        _update(assistantId, (message) => message.copyWith(toolRequest: chunk));
    }
  }

  void _finish(String assistantId) {
    _subscription = null;
    _streamingId = null;
    _update(assistantId, (message) => message.copyWith(isStreaming: false));
  }

  void _fail(String assistantId, Object error) {
    _subscription = null;
    _streamingId = null;
    _error = error;
    // An empty answer has nothing to show next to the error view.
    _messages = [
      for (final message in _messages)
        if (message.id != assistantId)
          message
        else if (message.text.isNotEmpty)
          message.copyWith(isStreaming: false),
    ];
    _notify();
  }

  void _update(String id, ChatMessage Function(ChatMessage) change) {
    _messages = [
      for (final message in _messages)
        message.id == id ? change(message) : message,
    ];
    _notify();
  }

  String _nextId() => 'local-${_sequence++}';

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    final subscription = _subscription;
    final id = _streamingId;
    _subscription = null;
    _streamingId = null;
    // Unblock a producer that waits for a tool answer nobody will give now.
    final pending = id == null
        ? null
        : _messages
              .where((message) => message.id == id)
              .firstOrNull
              ?.toolRequest;
    if (pending != null && !pending.isResolved) pending.reject();
    subscription?.cancel();
    super.dispose();
  }
}
