import 'dart:async';

import '../enums/assistant_role.dart';

/// Conversation summary shown in the list.
final class Conversation {
  /// Conversation with its [title] and last message.
  const Conversation({required this.id, required this.title, this.lastMessage});

  /// Id of the conversation.
  final String id;

  /// Title shown in the list.
  final String title;

  /// Last message, if any.
  final String? lastMessage;
}

/// Source that supports an answer (retrieval-augmented generation).
final class Citation {
  /// Source cited by an answer.
  const Citation({required this.title, required this.sourceId});

  /// Title of the source.
  final String title;

  /// Id of the source.
  final String sourceId;
}

/// Tokens consumed by one answer.
final class TokenUsage {
  /// Tokens an answer used.
  const TokenUsage({required this.input, required this.output});

  /// Tokens of the question.
  final int input;

  /// Tokens of the answer.
  final int output;
}

/// Message shown in a conversation. Immutable; the controller replaces it.
final class ChatMessage {
  /// Message of the user or the assistant.
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

  /// Id of the message.
  final String id;

  /// Who wrote it.
  final AssistantRole role;

  /// Text written so far.
  final String text;

  /// Sources it cites.
  final List<Citation> citations;

  /// Tokens it used, once finished.
  final TokenUsage? usage;

  /// Tool call it asks to confirm, if any.
  final ToolConfirmationRequest? toolRequest;

  /// Null while the request waits for the user, then the user's answer.
  final bool? toolApproved;

  /// Whether it is still being streamed.
  final bool isStreaming;

  /// Whether the user stopped it.
  final bool wasStopped;

  /// Copies the message with the given fields changed.
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
  /// Piece of text of a streamed answer.
  const AssistantTextChunk(this.text);

  /// The text of the piece.
  final String text;
}

/// Last chunk: citations and token usage of the answer.
final class AssistantFinalChunk extends AssistantChunk {
  /// Last piece of an answer, with its [citations] and [usage].
  const AssistantFinalChunk({required this.citations, required this.usage});

  /// Sources the answer cites.
  final List<Citation> citations;

  /// Tokens the answer used.
  final TokenUsage usage;
}

/// A tool that modifies data and needs the user's permission to run.
///
/// The producer waits on [decision]; the UI calls [confirm] or [reject].
final class ToolConfirmationRequest extends AssistantChunk {
  /// Tool call [toolName] the assistant wants to run, described by [summary].
  ToolConfirmationRequest({required this.toolName, required this.summary});

  /// Name of the tool.
  final String toolName;

  /// What the call would do.
  final String summary;

  final Completer<bool> _decision = Completer<bool>();

  /// Completes with true when confirmed and false when rejected.
  Future<bool> get decision => _decision.future;

  /// Whether the user already confirmed or rejected it.
  bool get isResolved => _decision.isCompleted;

  /// Confirms the call.
  void confirm() {
    if (!isResolved) _decision.complete(true);
  }

  /// Rejects the call.
  void reject() {
    if (!isResolved) _decision.complete(false);
  }
}
