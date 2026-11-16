import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/assistant_repository.dart';
import '../shared/constants/assistant_constants.dart';
import '../shared/enums/assistant_role.dart';
import '../shared/enums/chat_failure_kind.dart';
import '../shared/types/answer_state.dart';
import '../shared/types/assistant_types.dart';
import '../shared/types/chat_state.dart';

/// Holds the messages of one conversation and the state of the current answer.
final class AssistantChatController extends ChangeNotifier {
  AssistantChatController(this._repository, {required this._conversationId});

  final AssistantRepository _repository;
  final String _conversationId;

  ChatState _state = const ChatLoading();
  int _requestId = 0;
  StreamSubscription<AssistantChunk>? _subscription;
  Object? _pendingError;
  ChatMessage? _finishedAnswer;
  int _sequence = 0;
  bool _disposed = false;

  /// What the screen shows: loading, the messages with the state of the
  /// answer, or a failed load.
  ChatState get state => _state;

  /// Whether an answer is arriving.
  bool get isStreaming => switch (_state) {
    ChatReady(:final answer) => answer is AnswerStreaming,
    _ => false,
  };

  /// Loads the history, dropping the answer in progress. The result of an
  /// older call is dropped when a newer one started.
  Future<void> load() async {
    final id = ++_requestId;
    _cancelAnswer();
    _emit(const ChatLoading());
    final result = await AsyncValue.guard(
      () => _repository.loadMessages(_conversationId),
    );
    if (_disposed || id != _requestId) return;
    _emit(
      result.when(
        loading: () => const ChatLoading(),
        data: (messages) => ChatReady(messages, const AnswerIdle()),
        error: ChatFailed.new,
      ),
    );
  }

  /// Adds the user message and starts the answer. Ignored while the history
  /// is not loaded, while an answer is arriving and for a blank [text].
  void send(String text) {
    final current = _state;
    final trimmed = text.trim();
    if (trimmed.isEmpty || current is! ChatReady || isStreaming) return;

    final assistantId = _nextId();
    _pendingError = null;
    _finishedAnswer = null;
    _emit(
      ChatReady([
        ...current.messages,
        ChatMessage(id: _nextId(), role: AssistantRole.user, text: trimmed),
        ChatMessage(
          id: assistantId,
          role: AssistantRole.assistant,
          isStreaming: true,
        ),
      ], AnswerStreaming(assistantId)),
    );
    _subscription = _repository
        .ask(_conversationId, trimmed)
        .listen(
          (chunk) => _onChunk(assistantId, chunk),
          onError: (Object error) => _fail(assistantId, error),
          onDone: () => _finish(assistantId),
          cancelOnError: true,
        );
  }

  /// Cancels the answer in progress and keeps the text received so far.
  void stop() {
    final current = _state;
    if (current is! ChatReady) return;
    final answer = current.answer;
    if (answer is! AnswerStreaming) return;

    final hasPending =
        _pendingRequest(current.messages, answer.messageId) != null;
    _cancelAnswer();
    _emit(
      ChatReady(
        _replace(
          current.messages,
          answer.messageId,
          (message) => message.copyWith(
            isStreaming: false,
            wasStopped: true,
            toolApproved: hasPending ? false : null,
          ),
        ),
        const AnswerIdle(),
      ),
    );
  }

  /// Answers the tool confirmation shown in [messageId].
  void respondToTool({required String messageId, required bool approved}) {
    final current = _state;
    if (current is! ChatReady) return;
    final request = current.messages
        .where((message) => message.id == messageId)
        .firstOrNull
        ?.toolRequest;
    if (request == null || request.isResolved) return;

    if (approved) {
      request.confirm();
    } else {
      request.reject();
    }
    _emit(
      ChatReady(
        _replace(
          current.messages,
          messageId,
          (message) => message.copyWith(toolApproved: approved),
        ),
        current.answer,
      ),
    );
  }

  /// The error of the last failed answer, once. The next call returns null
  /// until another answer fails. [state] tells the [ChatFailureKind].
  Object? takeError() {
    final error = _pendingError;
    _pendingError = null;
    return error;
  }

  /// The last answer that finished by itself, once. A stopped or failed
  /// answer is not returned.
  ChatMessage? takeFinishedAnswer() {
    final message = _finishedAnswer;
    _finishedAnswer = null;
    return message;
  }

  void _onChunk(String assistantId, AssistantChunk chunk) {
    if (!_isStreamingOf(assistantId)) return;
    final change = switch (chunk) {
      AssistantTextChunk(:final text) => (
        ChatMessage message,
      ) => message.copyWith(text: message.text + text),
      AssistantFinalChunk(:final citations, :final usage) => (
        ChatMessage message,
      ) => message.copyWith(citations: citations, usage: usage),
      ToolConfirmationRequest() => (ChatMessage message) => message.copyWith(
        toolRequest: chunk,
      ),
    };
    final current = _state as ChatReady;
    _emit(
      ChatReady(
        _replace(current.messages, assistantId, change),
        current.answer,
      ),
    );
  }

  void _finish(String assistantId) {
    if (!_isStreamingOf(assistantId)) return;
    _subscription = null;
    final current = _state as ChatReady;
    final messages = _replace(
      current.messages,
      assistantId,
      (message) => message.copyWith(isStreaming: false),
    );
    final finished = messages.where((m) => m.id == assistantId).first;
    if (finished.text.isNotEmpty) _finishedAnswer = finished;
    _emit(ChatReady(messages, const AnswerIdle()));
  }

  void _fail(String assistantId, Object error) {
    if (!_isStreamingOf(assistantId)) return;
    _subscription = null;
    _pendingError = error;
    final current = _state as ChatReady;
    // An empty answer has nothing to show next to the error.
    final messages = [
      for (final message in current.messages)
        if (message.id != assistantId)
          message
        else if (message.text.isNotEmpty)
          message.copyWith(isStreaming: false),
    ];
    _emit(ChatReady(messages, AnswerFailed(_kindOf(error))));
  }

  ChatFailureKind _kindOf(Object error) =>
      error is ApiErrorException && error.problem.code == quotaExceededCode
      ? ChatFailureKind.quotaExceeded
      : ChatFailureKind.generic;

  bool _isStreamingOf(String assistantId) => switch (_state) {
    ChatReady(:final answer) =>
      answer is AnswerStreaming && answer.messageId == assistantId,
    _ => false,
  };

  ToolConfirmationRequest? _pendingRequest(
    List<ChatMessage> messages,
    String messageId,
  ) {
    final request = messages
        .where((message) => message.id == messageId)
        .firstOrNull
        ?.toolRequest;
    return request != null && !request.isResolved ? request : null;
  }

  /// Rejects a tool confirmation nobody will answer and cancels the stream.
  void _cancelAnswer() {
    final current = _state;
    if (current is ChatReady && current.answer is AnswerStreaming) {
      final answer = current.answer as AnswerStreaming;
      _pendingRequest(current.messages, answer.messageId)?.reject();
    }
    final subscription = _subscription;
    _subscription = null;
    unawaited(subscription?.cancel());
  }

  List<ChatMessage> _replace(
    List<ChatMessage> messages,
    String id,
    ChatMessage Function(ChatMessage) change,
  ) => [
    for (final message in messages)
      message.id == id ? change(message) : message,
  ];

  String _nextId() => 'local-${_sequence++}';

  void _emit(ChatState next) {
    if (_disposed) return;
    _state = next;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _cancelAnswer();
    super.dispose();
  }
}
