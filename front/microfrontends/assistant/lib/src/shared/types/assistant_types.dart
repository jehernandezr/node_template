import 'dart:async';

import '../enums/assistant_role.dart';

/// Conversation summary shown in the list.
final class Conversation {
  const Conversation({required this.id, required this.title, this.lastMessage});

  final String id;
  final String title;
  final String? lastMessage;
}

/// Source that supports an answer (retrieval-augmented generation).
final class Citation {
  const Citation({required this.title, required this.sourceId});

  final String title;
  final String sourceId;
}

/// Tokens consumed by one answer.
final class TokenUsage {
  const TokenUsage({required this.input, required this.output});

  final int input;
  final int output;
}

/// Message shown in a conversation. Immutable; the controller replaces it.
final class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    this.text = '',
    this.citations = const [],
    this.usage,
    this.toolRequest,
    this.toolApproved,
    this.isStreaming = false,
    this.wasStopped = false,
  });

  final String id;
  final AssistantRole role;
  final String text;
  final List<Citation> citations;
  final TokenUsage? usage;
  final ToolConfirmationRequest? toolRequest;

  /// Null while the request waits for the user, then the user's answer.
  final bool? toolApproved;
  final bool isStreaming;
  final bool wasStopped;

  ChatMessage copyWith({
    String? text,
    List<Citation>? citations,
    TokenUsage? usage,
    ToolConfirmationRequest? toolRequest,
    bool? toolApproved,
    bool? isStreaming,
    bool? wasStopped,
  }) => ChatMessage(
    id: id,
    role: role,
    text: text ?? this.text,
    citations: citations ?? this.citations,
    usage: usage ?? this.usage,
    toolRequest: toolRequest ?? this.toolRequest,
    toolApproved: toolApproved ?? this.toolApproved,
    isStreaming: isStreaming ?? this.isStreaming,
    wasStopped: wasStopped ?? this.wasStopped,
  );
}

/// One element of the answer stream.
///
/// The stream emits [AssistantTextChunk]s, optionally one
/// [ToolConfirmationRequest] (which pauses the stream until answered), and
/// ends with one [AssistantFinalChunk].
sealed class AssistantChunk {
  const AssistantChunk();
}

/// Piece of answer text.
final class AssistantTextChunk extends AssistantChunk {
  const AssistantTextChunk(this.text);

  final String text;
}

/// Last chunk: citations and token usage of the answer.
final class AssistantFinalChunk extends AssistantChunk {
  const AssistantFinalChunk({required this.citations, required this.usage});

  final List<Citation> citations;
  final TokenUsage usage;
}

/// A tool that modifies data and needs the user's permission to run.
///
/// The producer waits on [decision]; the UI calls [confirm] or [reject].
final class ToolConfirmationRequest extends AssistantChunk {
  ToolConfirmationRequest({required this.toolName, required this.summary});

  final String toolName;
  final String summary;

  final Completer<bool> _decision = Completer<bool>();

  /// Completes with true when confirmed and false when rejected.
  Future<bool> get decision => _decision.future;

  bool get isResolved => _decision.isCompleted;

  void confirm() {
    if (!isResolved) _decision.complete(true);
  }

  void reject() {
    if (!isResolved) _decision.complete(false);
  }
}
